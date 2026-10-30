# Fixed owner-private ACL helper for the local retrospective store.
#
# Invoked by the Node library as:
#   powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass
#                  -File windows-private.ps1 -Path <absolute-path> [-VerifyOnly]
#
# The path arrives as one literal argv value; no user content is interpolated
# into this script. In establish mode it applies a protected owner+SYSTEM DACL
# to a directory or file. VerifyOnly checks an existing directory or file
# without changing ACLs. Establish mode sets the current user as owner for a
# newly created directory or file (new Windows objects otherwise take the
# token's default owner, which may be a group SID under elevation). Both modes
# reject reparse points anywhere in the path.
#
# Documented limitation: local administrators can still take ownership. This
# is owner-restricted storage, not an OS sandbox.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$Path,
    [switch]$VerifyOnly,
    [ValidateSet('Directory', 'File')]
    [string]$ItemKind
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Stop-WithCode {
    param(
        [string]$Code,
        [string]$Message
    )
    [Console]::Error.WriteLine("AGS-$Code`: $Message")
    exit 2
}

try {
    if ([string]::IsNullOrWhiteSpace($Path)) {
        Stop-WithCode 'ACL-UNSUPPORTED' 'Empty path.'
    }
    if (-not [System.IO.Path]::IsPathRooted($Path)) {
        Stop-WithCode 'ACL-UNSUPPORTED' 'Absolute path required.'
    }
    $full = [System.IO.Path]::GetFullPath($Path)
    $pathRoot = [System.IO.Path]::GetPathRoot($full)
    $segments = $full.Substring($pathRoot.Length).Split([char[]]@('\', '/'), [System.StringSplitOptions]::RemoveEmptyEntries)
    $current = $pathRoot
    foreach ($segment in $segments) {
        $current = [System.IO.Path]::Combine($current, $segment)
        if (-not (Test-Path -LiteralPath $current)) { continue }
        $item = Get-Item -LiteralPath $current -Force
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            Stop-WithCode 'REPARSE-POINT' "Reparse point rejected: $current"
        }
        if ($current -ne $full -and -not $item.PSIsContainer) {
            Stop-WithCode 'NOT-DIRECTORY' "Not a directory: $current"
        }
    }

    if (-not (Test-Path -LiteralPath $full)) {
        if ($VerifyOnly) {
            Stop-WithCode 'ACL-FAILED' 'Path disappeared before ACL verification.'
        }
        New-Item -ItemType Directory -Path $full -Force | Out-Null
    }
    $target = Get-Item -LiteralPath $full -Force
    if (($target.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        Stop-WithCode 'REPARSE-POINT' 'Target is a reparse point.'
    }
    if (-not $VerifyOnly) {
        if ([string]::IsNullOrEmpty($ItemKind)) {
            Stop-WithCode 'ACL-FAILED' 'ItemKind is required for ACL establishment.'
        }
        if ($ItemKind -eq 'Directory' -and -not $target.PSIsContainer) {
            Stop-WithCode 'ACL-FAILED' 'Only directories can establish a protected directory ACL.'
        }
        if ($ItemKind -eq 'File' -and $target.PSIsContainer) {
            Stop-WithCode 'ACL-FAILED' 'A file ACL cannot be established on a directory.'
        }
    }
    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $ownerSid = $identity.User
    $systemSid = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')

    if (-not $VerifyOnly) {
        $acl = Get-Acl -LiteralPath $full
        $acl.SetAccessRuleProtection($true, $false)
        foreach ($rule in @($acl.Access)) {
            [void]$acl.RemoveAccessRuleAll($rule)
        }
        $inheritance = if ($ItemKind -eq 'Directory') {
            [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
        } else {
            [System.Security.AccessControl.InheritanceFlags]::None
        }
        $propagation = [System.Security.AccessControl.PropagationFlags]::None
        $allow = [System.Security.AccessControl.AccessControlType]::Allow
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($ownerSid, 'FullControl', $inheritance, $propagation, $allow)))
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($systemSid, 'FullControl', $inheritance, $propagation, $allow)))
        $acl.SetOwner($ownerSid)
        Set-Acl -LiteralPath $full -AclObject $acl
    }

    $verify = Get-Acl -LiteralPath $full
    if (-not $VerifyOnly -and -not $verify.AreAccessRulesProtected) {
        Stop-WithCode 'ACL-FAILED' 'ACL inheritance is still enabled.'
    }

    $ownerRules = 0
    foreach ($rule in @($verify.Access)) {
        if ($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow) {
            Stop-WithCode 'ACL-FAILED' 'Unexpected deny rule.'
        }
        $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
        if ($sid -ne $ownerSid.Value -and $sid -ne $systemSid.Value) {
            Stop-WithCode 'ACL-FAILED' "Unexpected access rule: $sid"
        }
        if ($sid -eq $ownerSid.Value) { $ownerRules += 1 }
    }
    if ($ownerRules -lt 1) {
        Stop-WithCode 'ACL-FAILED' 'No owner access rule was established.'
    }
    $verifyOwner = $verify.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
    if ($verifyOwner -ne $ownerSid.Value) {
        Stop-WithCode 'ACL-FAILED' 'Owner verification failed.'
    }
    exit 0
}
catch {
    Stop-WithCode 'ACL-FAILED' $_.Exception.Message
}
