# HSTS Preload Configuration Guide

## What is HSTS Preload?

HSTS (HTTP Strict Transport Security) Preload is a security mechanism that tells browsers to **always** use HTTPS when connecting to your domain, even on the first visit. This prevents man-in-the-middle attacks and SSL stripping.

## Current Configuration

Your backend is already configured with proper HSTS headers:

```typescript
// apps/backend/src/middlewares/security.middleware.ts
hsts: {
  maxAge: 31536000,        // 1 year
  includeSubDomains: true, // Apply to all subdomains
  preload: true,           // Enable preload
}
```

## Requirements for HSTS Preload

To submit your domain to the HSTS preload list, you must meet these requirements:

### 1. Valid SSL Certificate
- Obtain an SSL certificate from Let's Encrypt, DigiCert, or another CA
- Configure your web server (nginx, Apache, etc.) to use HTTPS

### 2. HTTP to HTTPS Redirect
- All HTTP traffic must redirect to HTTPS with a 301 or 302 status
- This is already configured in the backend (see `security.middleware.ts:26-33`)

### 3. HSTS Header Requirements
- ✅ `max-age` >= 31536000 (1 year)
- ✅ `includeSubDomains` directive present
- ✅ `preload` directive present

### 4. Base Domain Requirements
- The HSTS header must be served on the base domain (e.g., `example.com`)
- It must also be served on all subdomains (e.g., `www.example.com`, `api.example.com`)

## Validation Script

Before submitting to HSTS preload, validate your configuration:

```bash
cd apps/backend
npx tsx src/scripts/validate-hsts-preload.ts https://yourdomain.com
```

**Example output:**
```
========================================
HSTS Preload Validation Results
========================================

Domain: https://example.com
Status: ✅ PASSED

Checks:
  [✅] HTTPS available
  [✅] HTTP redirects to HTTPS
  [✅] HSTS header present
  [✅] max-age >= 1 year
  [✅] includeSubDomains enabled
  [✅] preload directive present

✅ Your domain meets all HSTS preload requirements!
📝 Next steps:
   1. Submit your domain to https://hstspreload.org/
   2. Wait for approval (can take several weeks)
   3. Your domain will be included in browsers HSTS preload list
========================================
```

## Submission Process

Once all checks pass:

1. **Test thoroughly in production**
   - Ensure HTTPS works correctly
   - Verify all subdomains are accessible via HTTPS
   - Test on multiple browsers

2. **Submit to HSTS Preload**
   - Go to https://hstspreload.org/
   - Enter your domain (e.g., `example.com`)
   - Click "Check HSTS preload status"
   - If eligible, click "Submit"

3. **Wait for approval**
   - Processing can take several weeks
   - You'll receive an email when approved
   - Your domain will be added to Chromium's HSTS preload list

4. **Propagation to browsers**
   - Chrome: Included in next release (~6 weeks)
   - Firefox: Pulls from Chromium list monthly
   - Safari: Pulls from Chromium list quarterly
   - Edge: Uses Chromium's list

## Important Warnings

⚠️ **HSTS preload is irreversible (sort of)**

- Once your domain is on the preload list, it's **very difficult** to remove
- Removal can take 6-12 months and requires browser updates
- Only enable if you're **100% committed** to HTTPS forever

⚠️ **Subdomain considerations**

- `includeSubDomains` applies to **ALL** subdomains
- If you have any subdomain that can't use HTTPS, **do not enable preload**
- Examples: `localhost.example.com`, `internal.example.com`

⚠️ **Testing recommendations**

- Test on a staging domain first (e.g., `staging.example.com`)
- Wait a few days to ensure everything works
- Only then enable on production

## Troubleshooting

### "HSTS header not present"
- Check that your reverse proxy (nginx, Caddy, etc.) is forwarding the header
- Verify Helmet.js is registered in `security.middleware.ts`

### "HTTP does not redirect to HTTPS"
- Check your reverse proxy configuration
- The backend redirects HTTP → HTTPS (see `security.middleware.ts:26-33`)
- Ensure your load balancer/CDN also redirects

### "max-age too low"
- Current config: 31536000 seconds (1 year) ✅
- If this fails, check for conflicting headers from reverse proxy

### "includeSubDomains missing"
- Current config: enabled ✅
- Check reverse proxy isn't stripping the header

## Monitoring

After enabling HSTS preload, monitor:

1. **SSL certificate expiration**
   - Set up alerts 30 days before expiry
   - Use tools like https://www.ssllabs.com/ssltest/

2. **HSTS header validation**
   - Run the validation script monthly
   - Set up automated checks in CI/CD

3. **Browser console errors**
   - Check for mixed content warnings
   - Ensure all resources load via HTTPS

## Resources

- Official HSTS Preload: https://hstspreload.org/
- HSTS RFC 6797: https://tools.ietf.org/html/rfc6797
- Mozilla HSTS Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
- SSL Labs Test: https://www.ssllabs.com/ssltest/

## Deployment Checklist

Before enabling HSTS preload in production:

- [ ] Valid SSL certificate installed
- [ ] All HTTP traffic redirects to HTTPS
- [ ] HSTS header verified with validation script
- [ ] All subdomains accessible via HTTPS
- [ ] Tested on staging environment for 7+ days
- [ ] Monitoring and alerts configured
- [ ] Team aware of HSTS implications
- [ ] Rollback plan documented (if needed)
- [ ] Domain submitted to https://hstspreload.org/
- [ ] Approval confirmation received
