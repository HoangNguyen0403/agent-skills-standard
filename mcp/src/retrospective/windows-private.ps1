# Fixed owner-private ACL helper for the local retrospective store.
#
# Invoked by the Node library as:
#   %SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe
#                  -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass
#                  -File <module-dir>\windows-private.ps1 -Serve
#
# -Serve reads one JSON request line from stdin at a time and writes one JSON
# response line. Each request carries items; each item runs the exact verify or
# establish logic below. No state is retained between requests except the
# process itself. Establish mode sets the current user as owner for a directory
# or file the store freshly created (new Windows objects otherwise take the
# token's default owner, which may be a group SID under elevation); the store
# root is the one intentional pre-existing establishment target. Verify mode
# only checks. Both modes reject reparse points anywhere in the path.
#
# Documented limitation: local administrators can still take ownership. This
# is owner-restricted storage, not an OS sandbox.
[CmdletBinding()]
param(
    [switch]$Serve
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)

$MaxRequestChars = 1048576

function New-AclRefusal {
    param(
        [string]$Code,
        [string]$Message
    )
    $refusal = [System.Exception]::new($Message)
    $refusal.Data['AGS-Code'] = $Code
    return $refusal
}

function Stop-AclItem {
    param(
        [string]$Code,
        [string]$Message
    )
    throw (New-AclRefusal $Code $Message)
}

function Get-PropertyValue {
    param(
        [object]$Object,
        [string]$Name
    )
    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) { return $null }
    return $property.Value
}

function Resolve-AclPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) {
        Stop-AclItem 'AGS-ACL-FAILED' 'Empty path.'
    }
    if (-not [System.IO.Path]::IsPathRooted($Path)) {
        Stop-AclItem 'AGS-ACL-FAILED' 'Absolute path required.'
    }
    $full = [System.IO.Path]::GetFullPath($Path)
    $pathRoot = [System.IO.Path]::GetPathRoot($full)
    $segments = $full.Substring($pathRoot.Length).Split(
        [char[]]@('\', '/'),
        [System.StringSplitOptions]::RemoveEmptyEntries
    )
    $current = $pathRoot
    foreach ($segment in $segments) {
        $current = [System.IO.Path]::Combine($current, $segment)
        if (-not (Test-Path -LiteralPath $current)) { continue }
        $item = Get-Item -LiteralPath $current -Force
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            Stop-AclItem 'AGS-REPARSE-POINT' "Reparse point rejected: $current"
        }
        if ($current -ne $full -and -not $item.PSIsContainer) {
            Stop-AclItem 'AGS-ACL-FAILED' "Not a directory: $current"
        }
    }
    return $full
}

function Invoke-AclItem {
    param(
        [string]$Path,
        [string]$Mode,
        [string]$ItemKind
    )
    if ($Mode -ne 'verify' -and $Mode -ne 'establish') {
        Stop-AclItem 'AGS-ACL-FAILED' 'Invalid ACL item mode.'
    }
    $full = Resolve-AclPath $Path
    if (-not (Test-Path -LiteralPath $full)) {
        if ($Mode -eq 'verify' -or $ItemKind -ne 'Directory') {
            Stop-AclItem 'AGS-ACL-FAILED' 'Path does not exist.'
        }
        New-Item -ItemType Directory -Path $full -Force | Out-Null
    }
    $target = Get-Item -LiteralPath $full -Force
    if (($target.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        Stop-AclItem 'AGS-REPARSE-POINT' 'Target is a reparse point.'
    }
    if ($Mode -eq 'establish') {
        if ([string]::IsNullOrEmpty($ItemKind)) {
            Stop-AclItem 'AGS-ACL-FAILED' 'ItemKind is required for ACL establishment.'
        }
        if ($ItemKind -ne 'Directory' -and $ItemKind -ne 'File') {
            Stop-AclItem 'AGS-ACL-FAILED' 'ItemKind is invalid.'
        }
        if ($ItemKind -eq 'Directory' -and -not $target.PSIsContainer) {
            Stop-AclItem 'AGS-ACL-FAILED' 'Only directories can establish a protected directory ACL.'
        }
        if ($ItemKind -eq 'File' -and $target.PSIsContainer) {
            Stop-AclItem 'AGS-ACL-FAILED' 'A file ACL cannot be established on a directory.'
        }
    }

    $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
    $ownerSid = $identity.User
    $systemSid = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')

    if ($Mode -eq 'establish') {
        $isDirectory = $ItemKind -eq 'Directory'
        if ($isDirectory) {
            $acl = [System.IO.Directory]::GetAccessControl($full)
        } else {
            $acl = [System.IO.File]::GetAccessControl($full)
        }
        $acl.SetAccessRuleProtection($true, $false)
        foreach ($rule in @($acl.Access)) {
            [void]$acl.RemoveAccessRuleAll($rule)
        }
        $inheritance = if ($isDirectory) {
            [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
        } else {
            [System.Security.AccessControl.InheritanceFlags]::None
        }
        $propagation = [System.Security.AccessControl.PropagationFlags]::None
        $allow = [System.Security.AccessControl.AccessControlType]::Allow
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($ownerSid, 'FullControl', $inheritance, $propagation, $allow)))
        $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule($systemSid, 'FullControl', $inheritance, $propagation, $allow)))
        $acl.SetOwner($ownerSid)
        if ($isDirectory) {
            [System.IO.Directory]::SetAccessControl($full, $acl)
        } else {
            [System.IO.File]::SetAccessControl($full, $acl)
        }
    }

    # .NET Framework ACL APIs avoid autoloading Microsoft.PowerShell.Security,
    # whose module import dominates the helper's cold start.
    $verify = if ($target.PSIsContainer) {
        [System.IO.Directory]::GetAccessControl($full)
    } else {
        [System.IO.File]::GetAccessControl($full)
    }
    if ($Mode -eq 'establish' -and -not $verify.AreAccessRulesProtected) {
        Stop-AclItem 'AGS-ACL-FAILED' 'ACL inheritance is still enabled.'
    }

    $ownerRules = 0
    foreach ($rule in @($verify.Access)) {
        if ($rule.AccessControlType -ne [System.Security.AccessControl.AccessControlType]::Allow) {
            Stop-AclItem 'AGS-ACL-FAILED' 'Unexpected deny rule.'
        }
        $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
        if ($sid -ne $ownerSid.Value -and $sid -ne $systemSid.Value) {
            Stop-AclItem 'AGS-ACL-FAILED' "Unexpected access rule: $sid"
        }
        if ($sid -eq $ownerSid.Value) { $ownerRules += 1 }
    }
    if ($ownerRules -lt 1) {
        Stop-AclItem 'AGS-ACL-FAILED' 'No owner access rule was established.'
    }
    $verifyOwner = $verify.GetOwner([System.Security.Principal.SecurityIdentifier]).Value
    if ($verifyOwner -ne $ownerSid.Value) {
        Stop-AclItem 'AGS-ACL-FAILED' 'Owner verification failed.'
    }
}

if (-not $Serve) {
    [Console]::Error.WriteLine('AGS-PROTOCOL: -Serve is required.')
    exit 2
}

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ($line.Length -eq 0) { continue }
    if ($line.Length -gt $MaxRequestChars) {
        [Console]::Error.WriteLine('AGS-PROTOCOL: request line is too large.')
        exit 2
    }

    try {
        $request = $line | ConvertFrom-Json
    } catch {
        [Console]::Error.WriteLine('AGS-PROTOCOL: request is not valid JSON.')
        exit 2
    }
    $idValue = Get-PropertyValue $request 'id'
    $idText = [string]$idValue
    if ($idText -notmatch '^\d+$') {
        [Console]::Error.WriteLine('AGS-PROTOCOL: request id is invalid.')
        exit 2
    }
    $itemsValue = Get-PropertyValue $request 'items'
    if ($null -eq $itemsValue) {
        [Console]::Error.WriteLine('AGS-PROTOCOL: request has no items.')
        exit 2
    }
    $items = @($itemsValue)
    if ($items.Count -lt 1) {
        [Console]::Error.WriteLine('AGS-PROTOCOL: request has no items.')
        exit 2
    }

    $results = New-Object System.Collections.Generic.List[object]
    foreach ($item in $items) {
        try {
            $pathValue = [string](Get-PropertyValue $item 'path')
            $modeValue = [string](Get-PropertyValue $item 'mode')
            $kindValue = [string](Get-PropertyValue $item 'itemKind')
            Invoke-AclItem -Path $pathValue -Mode $modeValue -ItemKind $kindValue
            $results.Add([ordered]@{ ok = $true })
        } catch {
            $code = 'AGS-ACL-FAILED'
            $detail = $_.Exception.Message
            if ($_.Exception.Data.Contains('AGS-Code')) {
                $code = [string]$_.Exception.Data['AGS-Code']
            }
            if ($code -ne 'AGS-REPARSE-POINT') {
                $code = 'AGS-ACL-FAILED'
            }
            $results.Add([ordered]@{ ok = $false; code = $code; detail = $detail })
            break
        }
    }

    $jsonResults = ($results | ForEach-Object {
        $_ | ConvertTo-Json -Compress -Depth 4
    }) -join ','
    $response = '{"id":' + $idText + ',"results":[' + $jsonResults + ']}'
    [Console]::Out.WriteLine($response)
    [Console]::Out.Flush()
}
