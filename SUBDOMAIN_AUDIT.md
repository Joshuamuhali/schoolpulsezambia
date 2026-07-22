# SUBDOMAIN USE CASE AUDIT

**Date**: January 18, 2026
**Scope**: Complete analysis of subdomain implementation, use cases, and recommendations

---

## 📋 CURRENT IMPLEMENTATION

### Database Schema

**Table: `schools`**
```sql
CREATE TABLE schools (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  subdomain    TEXT NOT NULL UNIQUE,  -- Unique constraint
  logo_url     TEXT,
  address      TEXT,
  phone        TEXT,
  email        TEXT,
  access_state access_state NOT NULL DEFAULT 'draft',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Table: `reserved_subdomains`**
```sql
CREATE TABLE reserved_subdomains (
  subdomain TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Reserved Names:**
- `admin` - System reserved - admin portal
- `api` - System reserved - API endpoints
- `www` - System reserved - WWW prefix
- `app` - System reserved - app platform
- `dashboard` - System reserved - dashboard
- `mail` - System reserved - mail server
- `ftp` - System reserved - FTP server
- `cdn` - System reserved - CDN
- `static` - System reserved - static assets
- `assets` - System reserved - asset hosting
- `help` - System reserved - help center
- `support` - System reserved - support portal
- `docs` - System reserved - documentation
- `blog` - System reserved - blog
- `status` - System reserved - status page
- `staging` - System reserved - staging environment
- `dev` - System reserved - development
- `test` - System reserved - testing
- `demo` - System reserved - demo
- `preview` - System reserved - preview

### Validation Function

**Function: `validate_subdomain()`**
- Checks length: 3-63 characters
- Checks format: lowercase, numbers, hyphens only
- Checks against reserved subdomains table
- Returns error message if invalid

### Frontend Implementation

**Utility: `getSubdomain()`**
```typescript
export function getSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  const ignoredDomains = ["localhost", "schoolpulse.com", "school-pulse.vercel.app"];
  
  if (ignoredDomains.includes(hostname)) {
    return null;
  }

  const parts = hostname.split(".");
  if (parts.length > 1) {
    return parts[0];
  }

  return null;
}
```

**Auth Hook: `useAuth.ts`**
- Extracts subdomain from URL
- Compares with JWT claims (school_id)
- Detects context mismatch
- Triggers `TenantSwitchPrompt` if mismatch

**Component: `TenantSwitchPrompt.tsx`**
- Shows modal when URL subdomain doesn't match JWT school
- Allows user to switch school context
- Calls `set_active_school` RPC to update JWT

---

## 🎯 INTENDED USE CASES

### 1. Multi-Tenant Isolation
**Purpose**: Each school gets a unique subdomain for complete data isolation

**Example**:
- School A: `acacia.schoolpulse.com`
- School B: `hillcrest.schoolpulse.com`
- School C: `stmarys.schoolpulse.com`

**How it works**:
1. User registers school with subdomain "acacia"
2. DNS record created: `acacia.schoolpulse.com → platform IP`
3. User accesses `acacia.schoolpulse.com`
4. App extracts subdomain "acacia"
5. App loads school data for "acacia"
6. JWT claims include school_id for "acacia"
7. RLS policies enforce data isolation

### 2. Tenant Context Switching
**Purpose**: Allow platform admins or multi-school users to switch between schools

**How it works**:
1. User has JWT for School A
2. User navigates to School B's subdomain
3. App detects mismatch
4. Shows `TenantSwitchPrompt`
5. User confirms switch
6. Calls `set_active_school` RPC
7. JWT updated with School B's school_id
8. User redirected to School B's dashboard

### 3. Reserved Name Protection
**Purpose**: Prevent schools from using system-critical subdomains

**How it works**:
1. User tries to register with subdomain "admin"
2. `validate_subdomain()` checks reserved table
3. Returns error: "This subdomain is reserved"
4. User must choose different subdomain

---

## ⚠️ ISSUES & CONCERNS

### 1. DNS Configuration Not Automated
**Problem**: Subdomain requires manual DNS setup

**Current State**:
- User chooses subdomain during onboarding
- Subdomain stored in database
- **No DNS record created automatically**
- User must manually configure DNS with their provider

**Impact**:
- User cannot access their school via subdomain immediately
- Requires technical knowledge of DNS
- Poor UX for non-technical users
- Support burden increased

**Evidence**:
```typescript
// No DNS creation logic found in codebase
// No integration with DNS providers (Cloudflare, Route53, etc.)
```

### 2. Development Environment Limitations
**Problem**: Subdomain routing doesn't work on localhost

**Current State**:
```typescript
const ignoredDomains = ["localhost", "schoolpulse.com", "school-pulse.vercel.app"];
```

**Impact**:
- Cannot test subdomain routing locally
- Must use path-based routing in dev
- Inconsistent dev vs prod behavior
- Hard to test tenant switching

**Workaround**:
- Use `school1.localhost` (requires hosts file modification)
- Use path-based routing in dev
- Skip subdomain validation in dev

### 3. Over-Engineering for MVP
**Problem**: Subdomain-based multi-tenancy is complex for initial launch

**Alternatives**:
1. **Path-based routing**: `schoolpulse.com/school/acacia`
2. **Header-based routing**: Use custom header for tenant ID
3. **JWT-only routing**: No URL-based routing, pure JWT context

**Benefits of alternatives**:
- No DNS configuration needed
- Works immediately after registration
- Simpler infrastructure
- Easier to test
- Lower cost (no wildcard SSL needed)

**Drawbacks of alternatives**:
- Less "branded" experience
- Requires shared domain
- Harder to scale to custom domains later

### 4. No Custom Domain Support
**Problem**: Schools cannot use their own domain

**Current State**:
- Only supports `*.schoolpulse.com` subdomains
- No mechanism for schools to use `school.acacia.edu.zm`
- No SSL certificate management for custom domains

**Impact**:
- Larger schools may want custom domains
- Branding limitation
- Trust issue for some institutions

### 5. Subdomain Collision Risk
**Problem**: No collision prevention across environments

**Current State**:
- Subdomain uniqueness enforced per database
- No validation across staging/production
- No collision prevention during migration

**Impact**:
- "acacia" could exist in staging and production
- Data migration issues
- Testing conflicts

### 6. No Subdomain Change Mechanism
**Problem**: Schools cannot change subdomain after registration

**Current State**:
- Subdomain is UNIQUE in database
- No UI for changing subdomain
- No migration path for subdomain changes

**Impact**:
- If school rebrands, stuck with old subdomain
- If subdomain becomes problematic, no fix
- User support burden

---

## 🔍 USE CASE VALIDATION

### Use Case 1: Multi-Tenant Isolation
**Status**: ⚠️ PARTIAL

**What Works**:
- Database schema supports unique subdomains
- RLS policies enforce data isolation
- JWT claims include school_id
- Subdomain extraction works

**What's Missing**:
- DNS automation
- Custom domain support
- Subdomain change mechanism
- Development environment support

**Recommendation**: Keep for long-term, but simplify for MVP

---

### Use Case 2: Tenant Context Switching
**Status**: ✅ WORKING

**What Works**:
- Subdomain extraction from URL
- JWT context comparison
- TenantSwitchPrompt component
- `set_active_school` RPC

**What's Missing**:
- Multi-school user support (users can only belong to one school currently)
- Recent schools list
- Quick switch dropdown

**Recommendation**: Good implementation, add multi-school user support later

---

### Use Case 3: Reserved Name Protection
**Status**: ✅ WORKING

**What Works**:
- Reserved subdomains table
- Validation function
- Server-side enforcement
- Good list of reserved names

**What's Missing**:
- Dynamic reserved list (admin can add/remove)
- Reserved pattern matching (e.g., `*-admin`)

**Recommendation**: Good implementation, add admin management later

---

## 💡 RECOMMENDATIONS

### Option A: Keep Subdomain-Based Routing (Long-term)

**Pros**:
- Professional branding
- Scalable to custom domains
- Industry standard for multi-tenant SaaS
- Clear separation of tenants

**Cons**:
- Complex infrastructure
- DNS management overhead
- SSL certificate management
- Development complexity

**Required Changes**:
1. **Automate DNS** - Integrate with Cloudflare API or Route53
2. **Wildcard SSL** - Configure wildcard SSL for `*.schoolpulse.com`
3. **Custom Domains** - Add custom domain support with Let's Encrypt
4. **Dev Support** - Add subdomain routing for localhost (hosts file or dnsmasq)
5. **Subdomain Management** - Add UI for changing subdomains
6. **Collision Prevention** - Add environment-aware validation

**Timeline**: 4-6 weeks for full implementation

---

### Option B: Path-Based Routing (MVP)

**Pros**:
- No DNS configuration needed
- Works immediately after registration
- Simpler infrastructure
- Easier to test
- Lower cost

**Cons**:
- Less branded experience
- Harder to migrate to custom domains later
- Shared domain
- URL structure less clean

**Implementation**:
```
Current:  acacia.schoolpulse.com
New:      schoolpulse.com/school/acacia
```

**Required Changes**:
1. Remove subdomain from onboarding (use auto-generated ID)
2. Update routing to use path-based tenant resolution
3. Update RLS to use path-based context
4. Remove `getSubdomain()` usage
5. Keep JWT-based context switching

**Timeline**: 1-2 weeks

---

### Option C: Hybrid Approach (Recommended)

**Phase 1 (MVP)**: Path-based routing
- Use path-based routing for initial launch
- Auto-generate school IDs (e.g., `sch-12345`)
- URL: `schoolpulse.com/school/sch-12345`
- No DNS configuration needed

**Phase 2 (Growth)**: Add subdomain support
- Optional subdomain assignment
- Schools can choose to enable subdomain
- Manual DNS setup initially
- URL: `schoolpulse.com/school/sch-12345` OR `acacia.schoolpulse.com`

**Phase 3 (Scale)**: Full subdomain + custom domains
- Automated DNS provisioning
- Custom domain support
- SSL automation
- URL: `schoolpulse.com/school/sch-12345` OR `acacia.schoolpulse.com` OR `school.acacia.edu.zm`

**Benefits**:
- Fast MVP launch
- Gradual feature rollout
- User choice in branding level
- Scalable architecture

**Timeline**:
- Phase 1: 1-2 weeks (MVP)
- Phase 2: 3-4 weeks (Growth)
- Phase 3: 4-6 weeks (Scale)

---

## 🎯 IMMEDIATE ACTION PLAN

### For MVP Launch (Recommended)

**Option C - Phase 1: Path-Based Routing**

1. **Remove subdomain from onboarding**
   - Remove subdomain input field
   - Auto-generate school ID: `sch-{timestamp}-{random}`
   - Update schema to use `school_id` instead of `subdomain` for routing

2. **Update routing**
   - Change from subdomain-based to path-based
   - URL pattern: `/school/:schoolId/*`
   - Update `getSubdomain()` to use path parameter

3. **Keep JWT context**
   - JWT still includes school_id
   - RLS still enforces isolation
   - Context switching still works via JWT

4. **Update onboarding flow**
   - Step 1: Account (name, email, password)
   - Step 2: School Details (school name only - no subdomain)
   - Step 3: Select Modules
   - Step 4: Review & Submit

5. **Keep reserved names table**
   - Still useful for future subdomain feature
   - No changes needed

**Files to Modify**:
- `src/pages/auth/OnboardingPage.tsx` - Remove subdomain field
- `src/lib/utils/tenant.ts` - Update to use path-based routing
- `src/hooks/useAuth.ts` - Update context resolution
- `src/App.tsx` - Update routing structure
- `supabase/migrations/` - Add school_id column, keep subdomain for future

---

### For Long-Term (Phase 2-3)

**Add Subdomain Support**

1. **Add subdomain management UI**
   - Allow schools to enable subdomain
   - Subdomain validation
   - Subdomain availability check

2. **Integrate DNS provider**
   - Cloudflare API integration
   - Route53 integration
   - Automated DNS record creation

3. **SSL automation**
   - Let's Encrypt integration
   - Wildcard SSL for platform
   - Custom SSL for custom domains

4. **Custom domain support**
   - Allow schools to add custom domain
   - DNS validation
   - SSL certificate provisioning

---

## 📊 COMPARISON

| Feature | Current | Path-Based (MVP) | Hybrid (Recommended) | Full Subdomain |
|---------|---------|------------------|---------------------|----------------|
| DNS Required | Yes | No | No (Phase 1) | Yes |
| Works Immediately | No | Yes | Yes | No |
| Custom Domains | No | No | Phase 3 | Yes |
| Development Support | Poor | Good | Good | Poor |
| Branding | Excellent | Poor | Phase 2+ | Excellent |
| Infrastructure Complexity | High | Low | Low → High | High |
| Time to Launch | 4-6 weeks | 1-2 weeks | 1-2 weeks | 4-6 weeks |
| Cost | High | Low | Low → High | High |

---

## ✅ CONCLUSION

**Current State**: Subdomain-based routing is implemented but incomplete (no DNS automation, dev issues, over-engineered for MVP)

**Recommendation**: **Option C - Hybrid Approach**

**Rationale**:
1. Fast MVP launch with path-based routing
2. Gradual rollout of subdomain features
3. User choice in branding level
4. Scalable architecture
5. Lower initial complexity and cost

**Next Steps**:
1. Implement Phase 1 (path-based routing) for MVP
2. Keep subdomain infrastructure for future
3. Add subdomain as optional feature in Phase 2
4. Add custom domains in Phase 3

**Estimated Timeline**:
- MVP (Phase 1): 1-2 weeks
- Growth (Phase 2): 3-4 weeks
- Scale (Phase 3): 4-6 weeks
