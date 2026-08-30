# 🚀 Azure Integration – Complete Local Setup Guide

This guide helps you run the azure-integration module locally with secure endpoints.

## 0️⃣ Prerequisites

✔ Node.js (v18+)  
✔ Git  
✔ Azure account (free/student works)

**Check Node:**
```bash
node -v
```

## 1️⃣ Clone & Enter Module
```bash
git clone <your-repo-url>
cd dad-cli-main/azure-integration
npm install
```

## 2️⃣ Create .env file
```bash
notepad .env
```

**Paste:**
```env
# =============================
# Azure Cosmos DB
# =============================
AZURE_COSMOS_ENDPOINT=
AZURE_COSMOS_KEY=
AZURE_COSMOS_DB=testpilot-db

# =============================
# Azure Vision
# =============================
AZURE_VISION_ENDPOINT=
AZURE_VISION_KEY=

# =============================
# Azure Monitor Auth
# =============================
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_LOG_WORKSPACE=

# =============================
# Middleware API KEY (SECURITY)
# =============================
API_KEY=my-super-secret-api-key
```

⚠️ **IMPORTANT**  
Change `my-super-secret-api-key` to something random.

**Example:**
```env
API_KEY=9xA2!kP#Qv7L
```

## 3️⃣ Cosmos DB Setup

### 3.1 Create DB
**Azure Portal** →  
Search **Azure Cosmos DB** → **Create** →  
Choose **Cosmos DB for NoSQL**

**Fill:**
| Field | Value |
|-------|-------|
| Resource group | `rg-testpilot` |
| Account name | any unique |
| Location | Central India |
| Capacity | Serverless |
| Free tier | YES |

**Deploy.**

### 3.2 Get Credentials
**Open resource** →  
**Settings** → **Keys**

**Copy:**
- `URI` → `AZURE_COSMOS_ENDPOINT`
- `PRIMARY KEY` → `AZURE_COSMOS_KEY`

### 3.3 Create Database
**Data Explorer** → **New Database**

**Name:** `testpilot-db`

**Inside it** → **New Container:**
- **Container:** `logs`
- **Partition key:** `/id`

## 4️⃣ Azure Vision Setup

**Search:**
```
Azure AI Vision
```

**Create:**
| Field | Value |
|-------|-------|
| Name | `testpilot-vision` |
| Resource group | `rg-testpilot` |
| Region | Central India |
| Pricing | Free (F0) |

**After deployment:**  
**Keys and Endpoint**

**Copy:**
- `Endpoint` → `AZURE_VISION_ENDPOINT`
- `Key 1` → `AZURE_VISION_KEY`

## 5️⃣ Azure Monitor Setup

### 5.1 Create Workspace
**Search:**
```
Log Analytics workspace
```

**Create:**
- **Name:** `testpilot-logs`
- **Resource group:** `rg-testpilot`

### 5.2 Copy ID
**Open workspace** → copy:
- `Workspace ID` → `AZURE_LOG_WORKSPACE`

## 6️⃣ Create Azure App (Auth)

### 6.1 App Registration
**Search:**
```
App registrations
```

**New registration:**
- **Name:** `testpilot-azure-auth`

### 6.2 Copy IDs
**From Overview:**
- `Application ID` → `AZURE_CLIENT_ID`
- `Directory ID` → `AZURE_TENANT_ID`

### 6.3 Create Secret
**Left** → **Certificates & secrets** → **New secret**  
**Copy VALUE:**
- → `AZURE_CLIENT_SECRET`

### 6.4 Assign Roles (CRITICAL)
**Go to:**
```
Log Analytics workspace
→ Access Control (IAM)
```

**Add roles:**
- ✔ Log Analytics Reader
- ✔ Monitoring Reader

**Assign to:**
```
testpilot-azure-auth
```

**Wait 2 minutes.**

## 7️⃣ Final .env
```env
AZURE_COSMOS_ENDPOINT=https://xxx.documents.azure.com/
AZURE_COSMOS_KEY=xxxxxxxx
AZURE_COSMOS_DB=testpilot-db

AZURE_VISION_ENDPOINT=https://testpilot-vision.cognitiveservices.azure.com/
AZURE_VISION_KEY=xxxxxxxx

AZURE_TENANT_ID=xxxxxxxx
AZURE_CLIENT_ID=xxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxx
AZURE_LOG_WORKSPACE=xxxxxxxx

API_KEY=9xA2!kP#Qv7L
```

## 8️⃣ Start server
```bash
npx tsx src/server.ts
```

## 9️⃣ USING SECURED ENDPOINTS (IMPORTANT)

⚠️ **Every request MUST include:**
```
x-api-key
```

### Test Vision
```powershell
Invoke-RestMethod http://localhost:5050/vision/analyze `
-Headers @{ "x-api-key"="9xA2!kP#Qv7L" } `
-Method POST `
-ContentType "application/json" `
-Body '{"url":"https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg"}'
```

### Test Cosmos DB
```powershell
Invoke-RestMethod http://localhost:5050/db/insert `
-Headers @{ "x-api-key"="9xA2!kP#Qv7L" } `
-Method POST `
-ContentType "application/json" `
-Body '{"msg":"hello"}'
```

### Test Monitor
```powershell
Invoke-RestMethod http://localhost:5050/monitor/query `
-Headers @{ "x-api-key"="9xA2!kP#Qv7L" } `
-Method POST `
-ContentType "application/json" `
-Body '{"query":"AzureActivity | take 5"}'
```

## 🔒 SECURITY NOTES

✔ API key protects all endpoints  
✔ Never commit .env  
✔ Rotate key periodically  
✔ Different keys for dev/prod

## 🎉 DONE

**User now has:**

✅ Azure DB  
✅ Vision API  
✅ Azure Monitor  
✅ Secured endpoints  
✅ Local dev ready