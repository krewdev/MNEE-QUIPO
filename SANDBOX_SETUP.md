# MNEE SDK Sandbox Configuration

## ✅ Using Sandbox API

The CLI is configured to use the **sandbox environment** by default for MNEE SDK.

## Current Configuration

The code defaults to `sandbox` unless explicitly set to `production`:

```typescript
const mneeEnv = process.env.MNEE_ENV === "production" ? "production" : "sandbox";
```

## Environment Variables

### Default (Sandbox)
```env
MNEE_API_KEY=your_api_key_here
# MNEE_ENV not set = defaults to sandbox ✅
```

### Explicit Sandbox
```env
MNEE_API_KEY=your_api_key_here
MNEE_ENV=sandbox
```

### Production (if needed later)
```env
MNEE_API_KEY=your_production_api_key_here
MNEE_ENV=production
```

## Verify It's Using Sandbox

When you run commands, the SDK will:
- ✅ Use sandbox API endpoints
- ✅ Connect to test/sandbox environment
- ✅ Use sandbox API key (if different from production)

## Testing

Run a balance check to verify:

```bash
./mnee-x balance --chain bitcoin --address 1Hx6egmCSWrdWsbQiHoLqr53cG8Qt2axc5
```

If it works without errors, you're successfully using the sandbox API! 🎉

## Switching to Production (Later)

When ready for production:
1. Get production API key from MNEE Developer Portal
2. Update `.env`:
   ```env
   MNEE_API_KEY=your_production_key
   MNEE_ENV=production
   ```

---

**Current Status:** ✅ Using **sandbox** environment by default


