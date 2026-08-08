#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Arabic RTL mobile-first single-vendor COD e-commerce store for Algeria (DZ Store). Storefront with products, shareable product links, product page with COD checkout form (Full Name, Phone, Wilaya 1-58, Commune), success page. Password-protected Arabic admin dashboard to CRUD products with image upload, manage orders with status tags (New/Confirmed/Shipped/Cancelled), copy product links, export orders to CSV/Excel."

backend:
  - task: "Admin login (POST /api/admin/login)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Password check against ADMIN_PASSWORD env (admin123). Returns token on success, 401 on wrong password."
        -working: true
        -agent: "testing"
        -comment: "✅ PASSED - Correct password returns {success:true, token:'admin123'}. Wrong password returns 401 with {success:false}. All scenarios working correctly."
  - task: "Products CRUD (GET list, GET one, POST, PUT, DELETE /api/products)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Auto-seeds 6 demo products if empty. GET public. POST/PUT/DELETE require x-admin-token header. Images stored as base64/URL strings array."
        -working: true
        -agent: "testing"
        -comment: "✅ PASSED - GET /products returns 6 auto-seeded products with correct structure (id, name, description, price, oldPrice, badge, stock, images, createdAt). No MongoDB _id leaks. POST creates product with UUID. GET by id retrieves correctly. PUT updates fields. DELETE removes product. Auth enforcement working (401 without token)."
  - task: "Orders (POST create public, GET list admin, PUT status admin, GET export CSV admin)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "POST /orders validates fullName, phone, wilaya, productId; snapshots product name/price/image, computes total. GET/PUT/export require admin token. CSV has UTF-8 BOM + Arabic headers. Status enum: new/confirmed/shipped/cancelled."
        -working: true
        -agent: "testing"
        -comment: "✅ PASSED - POST /orders (public) creates order with correct orderNumber, productName, unitPrice, total calculation (unitPrice * quantity), status='new'. Validation working: 400 for missing fields, 404 for invalid productId. GET /orders (admin) returns array with no _id leaks. PUT /orders/:id updates status correctly, 400 for invalid status. GET /orders/export returns CSV with UTF-8 BOM, Arabic headers, and Content-Type text/csv."
  - task: "Stats (GET /api/stats admin)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Returns totalOrders, productsCount, totalRevenue (excludes cancelled), byStatus counts. Admin token required."
        -working: true
        -agent: "testing"
        -comment: "✅ PASSED - Returns correct structure with totalOrders, productsCount, totalRevenue (excludes cancelled orders), byStatus object with new/confirmed/shipped/cancelled counts. Auth enforcement working (401 without token)."

frontend:
  - task: "Storefront + Product page COD checkout + Success + Admin dashboard"
    implemented: true
    working: "NA"
    file: "app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Full RTL Arabic UI built. Not yet tested via frontend agent (awaiting user permission)."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Built DZ Store backend. Please test all /api endpoints. Admin token = the password 'admin123' sent via header 'x-admin-token'. Verify: (1) seed products auto-created on first GET /api/products, (2) auth enforcement returns 401 without/with wrong token for admin routes, (3) order creation snapshots product + computes total, (4) order status update, (5) CSV export returns text/csv with content. Use NEXT_PUBLIC_BASE_URL/api as base."
    -agent: "testing"
    -message: "✅ ALL BACKEND TESTS PASSED - Completed comprehensive testing of all backend endpoints. Admin login working (correct/wrong password scenarios). Products CRUD fully functional with proper auth enforcement. Orders creation (public), validation, listing (admin), status updates (admin), and CSV export all working correctly. Stats endpoint returns correct data structure. No MongoDB _id leaks detected. All auth enforcement working (401 for unauthorized requests). Backend is production-ready."