# Release Checklist

## Pre-Release Validation

### Code Quality
- [ ] All ESLint errors fixed
- [ ] No high-priority security vulnerabilities (`npm audit`)
- [ ] All dependencies up to date
- [ ] No circular dependencies
- [ ] Code reviewed and approved

### Testing
- [ ] All critical tests passing (ignore flaky window tests)
- [ ] Manual testing on all target platforms:
  - [ ] Windows 10/11
  - [ ] macOS (Intel & Apple Silicon)
  - [ ] Ubuntu/Linux
- [ ] Crosshair functionality verified
- [ ] Settings persistence working
- [ ] Auto-update mechanism tested

### Assets & Documentation
- [ ] All required icons present (ico, icns, png)
- [ ] Crosshair assets complete
- [ ] README.md updated with new features
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json

### Build Process
- [ ] Clean build successful (`npm run pack`)
- [ ] All target platforms build without errors
- [ ] Bundle size optimized
- [ ] No dev dependencies in production build

## Release Process

### 1. Version Management
```bash
# Update version in package.json
npm version patch|minor|major --no-git-tag-version

# Update CHANGELOG.md with new version
# Commit version changes
git add .
git commit -m "chore: bump version to v$(node -p "require('./package.json').version")"
```

### 2. Build & Test
```bash
# Run production validation
npm run validate:production

# Build for all platforms
npm run build:release

# Test installers on each platform
```

### 3. Code Signing
- [ ] Windows executable signed with valid certificate
- [ ] macOS app signed with Apple Developer ID
- [ ] Linux packages verified

### 4. Distribution
- [ ] GitHub release created with:
  - [ ] Release notes
  - [ ] All platform binaries
  - [ ] Checksums
- [ ] Windows Store package uploaded
- [ ] Snap Store package published
- [ ] Auto-update files deployed

### 5. Post-Release
- [ ] Release announcement published
- [ ] Documentation updated
- [ ] Social media posts
- [ ] Monitor for issues in first 24 hours

## Platform-Specific Checks

### Windows
- [ ] Installer works without admin rights
- [ ] Windows Defender doesn't flag as malware
- [ ] Auto-update works correctly
- [ ] Uninstaller works properly

### macOS
- [ ] App opens without Gatekeeper warnings (when signed)
- [ ] Works on both Intel and Apple Silicon
- [ ] Accessibility permissions prompt works
- [ ] DMG mounts and installs correctly

### Linux
- [ ] AppImage executes on major distributions
- [ ] Snap install/remove works
- [ ] DEB/RPM packages install correctly
- [ ] Desktop integration works

## Emergency Rollback Plan

If critical issues are discovered post-release:

1. **Immediate Actions**
   - [ ] Remove download links
   - [ ] Disable auto-update
   - [ ] Post issue acknowledgment

2. **Communication**
   - [ ] GitHub issue created
   - [ ] Users notified via all channels
   - [ ] Estimated fix timeline provided

3. **Fix & Re-release**
   - [ ] Hot-fix branch created
   - [ ] Issue fixed and tested
   - [ ] Emergency release published

## Quality Gates

### Critical (Must Pass)
- [ ] Application launches successfully
- [ ] Core crosshair functionality works
- [ ] No data loss or corruption
- [ ] Security vulnerabilities addressed

### Important (Should Pass)
- [ ] All major features functional
- [ ] Performance within acceptable limits
- [ ] UI/UX polished
- [ ] Documentation complete

### Nice to Have
- [ ] All tests passing (including flaky ones)
- [ ] Perfect code coverage
- [ ] Zero linting warnings
- [ ] All TODO items addressed

## Automation

### CI/CD Pipeline
- [ ] GitHub Actions workflow runs successfully
- [ ] Automated security scanning passes
- [ ] Build artifacts generated correctly
- [ ] Release drafts created automatically

### Monitoring
- [ ] Error tracking configured
- [ ] Update analytics working
- [ ] Performance monitoring active
- [ ] User feedback collection ready

---

**Remember**: Better to delay a release than to ship with critical bugs.

**Emergency Contact**: maintainer@crossover.app
