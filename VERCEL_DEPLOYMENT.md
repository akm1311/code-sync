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
2. **GitHub/GitLab/Bitbucket**: Your code should be in a Git repository
3. **Database**: Have your Neon database connection string ready
4. **Google Cloud**: Set up a GCS bucket and service account credentials

## Environment Variables

Before deploying, you'll need to configure these environment variables in Vercel:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@host.neon.tech/dbname` |
| `GOOGLE_CLOUD_PROJECT_ID` | Your GCP project ID | `my-project-12345` |
| `GOOGLE_CLOUD_STORAGE_BUCKET` | GCS bucket name | `my-app-storage` |
| `GOOGLE_CLOUD_CREDENTIALS` | Service account JSON credentials | `{"type":"service_account",...}` |
| `NODE_ENV` | Environment mode | `production` |

### How to Add Environment Variables in Vercel

1. Go to your project in Vercel Dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its value
4. Select the environment(s): Production, Preview, Development
5. Click **Save**

> **Important**: For `GOOGLE_CLOUD_CREDENTIALS`, paste the entire JSON content as a single-line string or use Vercel's secret management.

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to Git**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your Git repository
   - Vercel will auto-detect settings

3. **Configure Build Settings**
   - **Framework Preset**: Other
   - **Build Command**: `npm run build` (auto-detected from `vercel-build` script)
   - **Output Directory**: `dist/public` (auto-detected from `vercel.json`)
   - **Install Command**: `npm install`

4. **Add Environment Variables**
   - Add all required environment variables listed above

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - Link to existing project or create new one
   - Confirm settings

4. **Add Environment Variables**
   ```bash
   vercel env add DATABASE_URL production
   vercel env add GOOGLE_CLOUD_PROJECT_ID production
   vercel env add GOOGLE_CLOUD_STORAGE_BUCKET production
   vercel env add GOOGLE_CLOUD_CREDENTIALS production
   vercel env add NODE_ENV production
   ```

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

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

### Google Cloud Storage Issues

**Issue**: File upload/download fails
- **Solution**: Verify GCS credentials are correctly formatted (single-line JSON)
- Check bucket permissions and CORS configuration
- Ensure service account has proper IAM roles

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
