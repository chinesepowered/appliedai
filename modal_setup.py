#!/usr/bin/env python3
"""
Modal Setup Script for Legal Research Engine

This script sets up Modal secrets and deploys the legal research functions.
Run this after adding your Modal credentials to the environment.
"""

import modal
import os
import sys

def setup_modal_secrets():
    """Setup Modal secrets for API keys"""
    
    # Check if we have the required environment variables
    gemini_key = os.environ.get('GEMINI_API_KEY')
    courtlistener_token = os.environ.get('COURTLISTENER_TOKEN', '')
    
    if not gemini_key:
        print("❌ GEMINI_API_KEY not found in environment")
        print("   Add it to your .env.local file and export it:")
        print("   export GEMINI_API_KEY=your_key_here")
        return False
    
    try:
        # Create Modal secrets
        print("🔐 Creating Modal secrets...")
        
        # Use modal CLI to create secrets
        import subprocess
        
        # Gemini API key secret
        result = subprocess.run([
            "modal", "secret", "create", "gemini-api-key", 
            f"GEMINI_API_KEY={gemini_key}"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Created gemini-api-key secret")
        else:
            print(f"❌ Failed to create gemini-api-key: {result.stderr}")
            return False
        
        # CourtListener token secret (optional)
        result2 = subprocess.run([
            "modal", "secret", "create", "courtlistener-token",
            f"COURTLISTENER_TOKEN=b2fc32b697eeb0576e983eed0188e4eaf48db583"
        ], capture_output=True, text=True)
        
        if result2.returncode == 0:
            print("✅ Created courtlistener-token secret")
        else:
            print(f"⚠️  CourtListener secret creation failed (optional): {result2.stderr}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating secrets: {e}")
        return False

def deploy_modal_app():
    """Deploy the Modal app"""
    
    print("🚀 Deploying Modal legal research app...")
    
    try:
        # Import and deploy the app
        from modal_research import app
        
        with modal.enable_output():
            app.deploy()
            
        print("✅ Modal app deployed successfully!")
        print("📋 Your app is now available at:")
        print("   https://your-app-name--legal-research.modal.run")
        
        return True
        
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        return False

def main():
    """Main setup function"""
    
    print("🏗️  Setting up Modal Legal Research Engine")
    print("=" * 50)
    
    # Step 1: Setup secrets
    if not setup_modal_secrets():
        print("\n❌ Secret setup failed. Please fix the issues above and try again.")
        return 1
    
    # Step 2: Deploy app
    if not deploy_modal_app():
        print("\n❌ App deployment failed. Check the errors above.")
        return 1
    
    print("\n🎉 Setup complete!")
    print("\nNext steps:")
    print("1. Add the Modal endpoint URL to your Next.js app")
    print("2. Test the research tree functionality")
    print("3. Deploy to Vercel for the hackathon demo")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
