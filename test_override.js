function isOverridden(targetPath, overrides) {
  const rel = targetPath.replace(/\\/g, '/');
  return overrides.some((o) => {
    const op = o.replace(/\\/g, '/').replace(/\/$/, '');
    return rel === op || 
           rel.startsWith(`${op}/`) || 
           rel.includes(`/${op}/`) || 
           rel.endsWith(`/${op}`);
  });
}

console.log(isOverridden('.cursor/rules/flutter/flutter-integration-testing/SKILL.md', ['flutter-integration-testing'])); // should be true
console.log(isOverridden('.cursor/rules/flutter/flutter-integration-testing', ['flutter-integration-testing'])); // should be true
console.log(isOverridden('.cursor/rules/flutter/flutter-project-standards/SKILL.md', ['flutter-project-standards'])); // should be true
console.log(isOverridden('.cursor/rules/flutter/flutter-project-standards', ['flutter-project-standards'])); // should be true
console.log(isOverridden('.cursor/rules/flutter/other/SKILL.md', ['flutter-project-standards'])); // should be false
console.log(isOverridden('my-folder/bloc-state-management/SKILL.md', ['bloc-state-management'])); // should be true
