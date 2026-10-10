import { runSecurityAudit } from './security-audit.mjs';

// EAS lifecycle hook: direct EAS builds must pass the same gate as local wrappers.
runSecurityAudit(process.env.EAS_BUILD_PROFILE === 'production');
