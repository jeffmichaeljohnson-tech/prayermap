/**
 * Datadog Setup Verification Script
 * 
 * Checks that Datadog is properly configured before starting the app
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface VerificationResult {
  check: string;
  status: '✅' | '❌' | '⚠️';
  message: string;
}

const results: VerificationResult[] = [];

// Check 1: Environment variables exist
function checkEnvVars(): VerificationResult {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    
    const hasAppId = envContent.includes('VITE_DATADOG_APP_ID=');
    const hasClientToken = envContent.includes('VITE_DATADOG_CLIENT_TOKEN=');
    
    if (hasAppId && hasClientToken) {
      // Extract values to verify they're not placeholders
      const appIdMatch = envContent.match(/VITE_DATADOG_APP_ID=(.+)/);
      const tokenMatch = envContent.match(/VITE_DATADOG_CLIENT_TOKEN=(.+)/);
      
      const appId = appIdMatch?.[1]?.trim();
      const token = tokenMatch?.[1]?.trim();
      
      if (appId && appId !== 'your_application_id_here' && appId.length > 10) {
        if (token && token !== 'your_client_token_here' && token.startsWith('pub')) {
          return {
            check: 'Environment Variables',
            status: '✅',
            message: `App ID: ${appId.substring(0, 8)}... | Token: ${token.substring(0, 8)}...`
          };
        }
      }
      
      return {
        check: 'Environment Variables',
        status: '⚠️',
        message: 'Variables exist but may contain placeholder values'
      };
    }
    
    return {
      check: 'Environment Variables',
      status: '❌',
      message: 'Missing VITE_DATADOG_APP_ID or VITE_DATADOG_CLIENT_TOKEN'
    };
  } catch (error) {
    return {
      check: 'Environment Variables',
      status: '❌',
      message: `Error reading .env file: ${error}`
    };
  }
}

// Check 2: Packages installed
function checkPackages(): VerificationResult {
  try {
    const packageJsonPath = join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const hasRum = '@datadog/browser-rum' in deps;
    const hasRumReact = '@datadog/browser-rum-react' in deps;
    
    if (hasRum && hasRumReact) {
      return {
        check: 'Datadog Packages',
        status: '✅',
        message: `@datadog/browser-rum@${deps['@datadog/browser-rum']} and @datadog/browser-rum-react@${deps['@datadog/browser-rum-react']} installed`
      };
    }
    
    return {
      check: 'Datadog Packages',
      status: '❌',
      message: 'Missing @datadog/browser-rum or @datadog/browser-rum-react'
    };
  } catch (error) {
    return {
      check: 'Datadog Packages',
      status: '❌',
      message: `Error checking packages: ${error}`
    };
  }
}

// Check 3: Code configuration
function checkCodeConfig(): VerificationResult {
  try {
    const datadogPath = join(process.cwd(), 'src/lib/datadog.ts');
    const code = readFileSync(datadogPath, 'utf-8');
    
    const hasReactPlugin = code.includes('reactPlugin');
    const hasImport = code.includes("from '@datadog/browser-rum-react'");
    const hasPlugins = code.includes('plugins:');
    const hasInit = code.includes('datadogRum.init');
    
    if (hasReactPlugin && hasImport && hasPlugins && hasInit) {
      return {
        check: 'Code Configuration',
        status: '✅',
        message: 'React plugin imported and configured correctly'
      };
    }
    
    const issues: string[] = [];
    if (!hasReactPlugin) issues.push('reactPlugin not used');
    if (!hasImport) issues.push('React plugin not imported');
    if (!hasPlugins) issues.push('plugins array missing');
    if (!hasInit) issues.push('datadogRum.init missing');
    
    return {
      check: 'Code Configuration',
      status: '❌',
      message: `Issues: ${issues.join(', ')}`
    };
  } catch (error) {
    return {
      check: 'Code Configuration',
      status: '❌',
      message: `Error reading datadog.ts: ${error}`
    };
  }
}

// Run all checks
console.log('🔍 Verifying Datadog Setup...\n');

results.push(checkEnvVars());
results.push(checkPackages());
results.push(checkCodeConfig());

// Print results
results.forEach(result => {
  console.log(`${result.status} ${result.check}: ${result.message}`);
});

// Summary
const allPassed = results.every(r => r.status === '✅');
const hasWarnings = results.some(r => r.status === '⚠️');
const hasErrors = results.some(r => r.status === '❌');

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All checks passed! Datadog is ready to use.');
  console.log('\nNext steps:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Check browser console for: "✅ Datadog RUM initialized"');
  console.log('3. Test with: window.datadogRum?.addAction("test.prayermap", { test: true })');
  process.exit(0);
} else if (hasErrors) {
  console.log('❌ Some checks failed. Please fix the issues above.');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️ Setup complete but with warnings. Review above.');
  process.exit(0);
}

