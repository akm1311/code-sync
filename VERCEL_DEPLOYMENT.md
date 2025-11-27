# Deploying to Vercel - Complete Guide

This guide will help you deploy your full-stack application to Vercel.

## Overview

This application has been optimized for Vercel deployment with:
- ✅ **Serverless API**: Express routes converted to Vercel serverless functions
- ✅ **Static Frontend**: React + Vite optimized build
- ✅ **Database**: Neon PostgreSQL integration
- ✅ **Object Storage**: Google Cloud Storage support
- ✅ **SPA Routing**: Proper client-side routing configuration

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
## Database Setup

### Initialize Database Schema

After first deployment, you need to push your database schema:

1. **Set DATABASE_URL locally** (create `.env` file):
   ```
   DATABASE_URL=your_neon_connection_string
   ```

2. **Push schema to database**:
   ```bash
   npm run db:push
   ```

This creates the necessary tables in your Neon database.

## Post-Deployment Verification

### 1. Check Frontend
- Visit your Vercel deployment URL
- Verify the React app loads correctly
- Test navigation and routing

### 2. Test API Endpoints
Use a tool like Postman or curl to test:

```bash
# Get shared code
curl https://your-app.vercel.app/api/code

# Get files
curl https://your-app.vercel.app/api/files
```

### 3. Monitor Logs
- Go to Vercel Dashboard → Your Project → Functions
- Check function logs for any errors
- Monitor real-time logs during testing

## Project Structure for Vercel

```
code-sync/
├── api/
│   └── index.ts              # Serverless function entry point
├── client/
│   ├── index.html           # SPA entry point
│   └── src/                 # React application
├── server/
│   ├── index.ts            # Express app (used in dev)
│   ├── routes.ts           # API routes
│   └── ...                 # Other server files
├── dist/
│   └── public/             # Built static files (generated)
├── vercel.json             # Vercel configuration
├── .vercelignore          # Files to exclude from deployment
├── package.json           # Dependencies & scripts
└── vite.config.ts        # Vite build configuration
```

## Local Development

Development workflow remains unchanged:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Visit http://localhost:5000
```

The development server runs the full Express app with Vite HMR.

## Troubleshooting

### Build Fails

**Issue**: Build fails with TypeScript errors
- **Solution**: Run `npm run check` locally to verify TypeScript compilation
- Ensure all dependencies are in `package.json`

**Issue**: Module not found errors
- **Solution**: Check that all imports use correct paths
- Verify `tsconfig.json` path mappings

### API Routes Not Working

**Issue**: 404 on API endpoints
- **Solution**: Check `vercel.json` rewrites configuration
- Ensure API routes are properly exported in `api/index.ts`

**Issue**: 500 Internal Server Error
- **Solution**: Check Vercel function logs for detailed errors
- Verify environment variables are set correctly
- Check database connection string format

### Database Connection Issues

**Issue**: Cannot connect to database
- **Solution**: Verify `DATABASE_URL` is set in Vercel
- Check Neon database is accessible (not paused)
- Ensure connection string includes `?sslmode=require`

### File Storage Issues

**Issue**: File upload/download fails
- **Solution**: Ensure `BLOB_READ_WRITE_TOKEN` is set (Vercel sets this automatically)
- Check file size limits (Vercel Blob free tier: 1GB total)
- For larger files, consider upgrading Vercel Blob plan

### SPA Routing Issues


**Issue**: 404 on page refresh
- **Solution**: Verify `vercel.json` has catch-all rewrite to `/index.html`
- This is already configured in your `vercel.json`

## Performance Optimization

### Enable Edge Caching

For static assets, Vercel automatically enables edge caching. For API routes:

1. Add appropriate `Cache-Control` headers in your API responses
2. Use Vercel's Edge Config for frequently accessed data
3. Consider using Vercel's Incremental Static Regeneration (ISR) if applicable

### Monitor Function Performance

- Check function execution time in Vercel Dashboard
- Optimize cold start times by reducing dependencies
- Use connection pooling for database connections

## Custom Domain

To add a custom domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as instructed
4. Vercel will automatically provision SSL certificate

## CI/CD

Vercel automatically:
- ✅ Deploys on every push to main branch (production)
- ✅ Creates preview deployments for pull requests
- ✅ Runs build checks before deployment
- ✅ Provides deployment previews with unique URLs

## Support & Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Neon Documentation**: [neon.tech/docs](https://neon.tech/docs)
- **Google Cloud Storage**: [cloud.google.com/storage/docs](https://cloud.google.com/storage/docs)

## Notes

- The Python files (`main.py`, `database.py`, `models.py`) are **not** deployed to Vercel
- They're excluded via `.vercelignore` as Vercel doesn't support Python in this configuration
- If you need those features, they should be rewritten as Node.js API routes

---

**Happy Deploying! 🚀**

If you encounter any issues not covered here, check the Vercel function logs for detailed error messages.
