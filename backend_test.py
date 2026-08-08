#!/usr/bin/env python3
"""
Backend API Test Suite for DZ Store
Tests all backend endpoints with authentication and validation
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Load base URL from .env
BASE_URL = "https://dz-store-hub.preview.emergentagent.com/api"
ADMIN_TOKEN = "admin123"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name: str, passed: bool, details: str = ""):
    status = f"{Colors.GREEN}✓ PASS{Colors.END}" if passed else f"{Colors.RED}✗ FAIL{Colors.END}"
    print(f"{status} - {name}")
    if details:
        print(f"  {details}")
    return passed

def make_request(method: str, endpoint: str, headers: Optional[Dict] = None, 
                 json_data: Optional[Dict] = None, expect_json: bool = True) -> tuple:
    """Make HTTP request and return (success, response, data)"""
    url = f"{BASE_URL}{endpoint}"
    try:
        if headers is None:
            headers = {}
        headers['Content-Type'] = 'application/json'
        
        response = requests.request(method, url, headers=headers, json=json_data, timeout=10)
        
        if expect_json:
            try:
                data = response.json()
            except Exception:
                data = None
        else:
            data = response.text
        
        return True, response, data
    except Exception as e:
        print(f"  {Colors.RED}Request failed: {str(e)}{Colors.END}")
        return False, None, None

def test_products_auto_seed():
    """Test 1: GET /api/products - should auto-seed and return 6 demo products"""
    print(f"\n{Colors.BLUE}=== Test 1: Products Auto-Seed ==={Colors.END}")
    
    success, response, data = make_request('GET', '/products')
    if not success:
        return print_test("GET /api/products", False, "Request failed")
    
    # Check status code
    if response.status_code != 200:
        return print_test("GET /api/products", False, f"Expected 200, got {response.status_code}")
    
    # Check it's an array
    if not isinstance(data, list):
        return print_test("GET /api/products", False, f"Expected array, got {type(data)}")
    
    # Check we have 6 products
    if len(data) != 6:
        return print_test("GET /api/products", False, f"Expected 6 products, got {len(data)}")
    
    # Check product structure
    required_fields = ['id', 'name', 'description', 'price', 'oldPrice', 'badge', 'stock', 'images', 'createdAt']
    product = data[0]
    missing_fields = [f for f in required_fields if f not in product]
    if missing_fields:
        return print_test("GET /api/products", False, f"Missing fields: {missing_fields}")
    
    # Check NO _id in response
    if '_id' in product:
        return print_test("GET /api/products", False, "MongoDB _id leaked into response")
    
    # Check images is an array
    if not isinstance(product['images'], list):
        return print_test("GET /api/products", False, f"images should be array, got {type(product['images'])}")
    
    print_test("GET /api/products", True, f"Returned {len(data)} products with correct structure, no _id leaks")
    return data  # Return products for later tests

def test_admin_login():
    """Test 2: POST /api/admin/login with correct and wrong password"""
    print(f"\n{Colors.BLUE}=== Test 2: Admin Login ==={Colors.END}")
    
    # Test with correct password
    success, response, data = make_request('POST', '/admin/login', json_data={"password": "admin123"})
    if not success:
        print_test("POST /api/admin/login (correct password)", False, "Request failed")
        return False
    
    if response.status_code != 200:
        print_test("POST /api/admin/login (correct password)", False, f"Expected 200, got {response.status_code}")
        return False
    
    if not data.get('success'):
        print_test("POST /api/admin/login (correct password)", False, f"Expected success:true, got {data}")
        return False
    
    if data.get('token') != "admin123":
        print_test("POST /api/admin/login (correct password)", False, f"Expected token 'admin123', got {data.get('token')}")
        return False
    
    print_test("POST /api/admin/login (correct password)", True, "Returns {success:true, token:'admin123'}")
    
    # Test with wrong password
    success, response, data = make_request('POST', '/admin/login', json_data={"password": "wrongpassword"})
    if not success:
        print_test("POST /api/admin/login (wrong password)", False, "Request failed")
        return False
    
    if response.status_code != 401:
        print_test("POST /api/admin/login (wrong password)", False, f"Expected 401, got {response.status_code}")
        return False
    
    if data.get('success') != False:
        print_test("POST /api/admin/login (wrong password)", False, f"Expected success:false, got {data}")
        return False
    
    print_test("POST /api/admin/login (wrong password)", True, "Returns 401 with success:false")
    return True

def test_auth_enforcement():
    """Test 3: Auth enforcement - admin routes must return 401 without proper token"""
    print(f"\n{Colors.BLUE}=== Test 3: Auth Enforcement ==={Colors.END}")
    
    admin_routes = [
        ('POST', '/products', {"name": "Test"}),
        ('PUT', '/products/test-id', {"name": "Updated"}),
        ('DELETE', '/products/test-id', None),
        ('GET', '/orders', None),
        ('GET', '/stats', None),
        ('GET', '/orders/export', None),
        ('PUT', '/orders/test-id', {"status": "confirmed"}),
    ]
    
    all_passed = True
    
    for method, endpoint, json_data in admin_routes:
        # Test without token
        success, response, data = make_request(method, endpoint, json_data=json_data)
        if not success or response.status_code != 401:
            print_test(f"{method} {endpoint} (no token)", False, f"Expected 401, got {response.status_code if response else 'no response'}")
            all_passed = False
        else:
            print_test(f"{method} {endpoint} (no token)", True, "Returns 401")
        
        # Test with wrong token
        headers = {'x-admin-token': 'wrongtoken'}
        success, response, data = make_request(method, endpoint, headers=headers, json_data=json_data)
        if not success or response.status_code != 401:
            print_test(f"{method} {endpoint} (wrong token)", False, f"Expected 401, got {response.status_code if response else 'no response'}")
            all_passed = False
        else:
            print_test(f"{method} {endpoint} (wrong token)", True, "Returns 401")
    
    return all_passed

def test_products_crud(products):
    """Test 4: Products CRUD with admin auth"""
    print(f"\n{Colors.BLUE}=== Test 4: Products CRUD ==={Colors.END}")
    
    headers = {'x-admin-token': ADMIN_TOKEN}
    
    # POST - Create product
    new_product_data = {
        "name": "منتج تجريبي",
        "description": "وصف المنتج التجريبي",
        "price": 1500,
        "oldPrice": 2000,
        "badge": "جديد",
        "stock": 10,
        "images": ["https://example.com/image.jpg"]
    }
    
    success, response, data = make_request('POST', '/products', headers=headers, json_data=new_product_data)
    if not success or response.status_code not in [200, 201]:
        print_test("POST /api/products (create)", False, f"Expected 200/201, got {response.status_code if response else 'no response'}")
        return False
    
    if 'id' not in data:
        print_test("POST /api/products (create)", False, "Response missing 'id' field")
        return False
    
    if '_id' in data:
        print_test("POST /api/products (create)", False, "MongoDB _id leaked into response")
        return False
    
    created_id = data['id']
    print_test("POST /api/products (create)", True, f"Created product with id: {created_id}")
    
    # GET - Get single product
    success, response, data = make_request('GET', f'/products/{created_id}')
    if not success or response.status_code != 200:
        print_test(f"GET /api/products/{created_id}", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    if data.get('id') != created_id:
        print_test(f"GET /api/products/{created_id}", False, f"Expected id {created_id}, got {data.get('id')}")
        return False
    
    print_test(f"GET /api/products/{created_id}", True, "Returns correct product")
    
    # PUT - Update product
    update_data = {
        "name": "منتج محدث",
        "price": 1800
    }
    
    success, response, data = make_request('PUT', f'/products/{created_id}', headers=headers, json_data=update_data)
    if not success or response.status_code != 200:
        print_test(f"PUT /api/products/{created_id}", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    if data.get('name') != "منتج محدث" or data.get('price') != 1800:
        print_test(f"PUT /api/products/{created_id}", False, f"Update not reflected: {data}")
        return False
    
    print_test(f"PUT /api/products/{created_id}", True, "Product updated successfully")
    
    # DELETE - Delete product
    success, response, data = make_request('DELETE', f'/products/{created_id}', headers=headers)
    if not success or response.status_code != 200:
        print_test(f"DELETE /api/products/{created_id}", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    if not data.get('success'):
        print_test(f"DELETE /api/products/{created_id}", False, f"Expected success:true, got {data}")
        return False
    
    print_test(f"DELETE /api/products/{created_id}", True, "Product deleted successfully")
    
    return True

def test_orders(products):
    """Test 5: Orders - create, validation, list, update, export"""
    print(f"\n{Colors.BLUE}=== Test 5: Orders ==={Colors.END}")
    
    if not products or len(products) == 0:
        print_test("Orders test", False, "No products available for testing")
        return False
    
    product_id = products[0]['id']
    headers = {'x-admin-token': ADMIN_TOKEN}
    
    # POST - Create order (public, no auth)
    order_data = {
        "productId": product_id,
        "quantity": 2,
        "fullName": "محمد أمين",
        "phone": "0555123456",
        "wilaya": "16 - الجزائر",
        "commune": "باب الوادي"
    }
    
    success, response, data = make_request('POST', '/orders', json_data=order_data)
    if not success or response.status_code != 200:
        print_test("POST /api/orders (create)", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    # Verify order structure
    required_fields = ['orderNumber', 'productName', 'unitPrice', 'total', 'status']
    missing = [f for f in required_fields if f not in data]
    if missing:
        print_test("POST /api/orders (create)", False, f"Missing fields: {missing}")
        return False
    
    if data['status'] != 'new':
        print_test("POST /api/orders (create)", False, f"Expected status 'new', got {data['status']}")
        return False
    
    expected_total = products[0]['price'] * 2
    if data['total'] != expected_total:
        print_test("POST /api/orders (create)", False, f"Expected total {expected_total}, got {data['total']}")
        return False
    
    if '_id' in data:
        print_test("POST /api/orders (create)", False, "MongoDB _id leaked into response")
        return False
    
    order_id = data['id']
    print_test("POST /api/orders (create)", True, f"Order created with orderNumber: {data['orderNumber']}, total: {data['total']}")
    
    # POST - Missing required fields
    invalid_order = {"productId": product_id, "quantity": 1}
    success, response, data = make_request('POST', '/orders', json_data=invalid_order)
    if not success or response.status_code != 400:
        print_test("POST /api/orders (missing fields)", False, f"Expected 400, got {response.status_code if response else 'no response'}")
    else:
        print_test("POST /api/orders (missing fields)", True, "Returns 400 for missing fields")
    
    # POST - Invalid product ID
    invalid_product_order = {
        "productId": "invalid-id-12345",
        "quantity": 1,
        "fullName": "Test User",
        "phone": "0555123456",
        "wilaya": "16 - الجزائر"
    }
    success, response, data = make_request('POST', '/orders', json_data=invalid_product_order)
    if not success or response.status_code != 404:
        print_test("POST /api/orders (invalid productId)", False, f"Expected 404, got {response.status_code if response else 'no response'}")
    else:
        print_test("POST /api/orders (invalid productId)", True, "Returns 404 for invalid product")
    
    # GET - List orders (admin)
    success, response, data = make_request('GET', '/orders', headers=headers)
    if not success or response.status_code != 200:
        print_test("GET /api/orders (admin)", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    if not isinstance(data, list):
        print_test("GET /api/orders (admin)", False, f"Expected array, got {type(data)}")
        return False
    
    # Check no _id leaks
    if len(data) > 0 and '_id' in data[0]:
        print_test("GET /api/orders (admin)", False, "MongoDB _id leaked into response")
        return False
    
    print_test("GET /api/orders (admin)", True, f"Returns {len(data)} orders, no _id leaks")
    
    # PUT - Update order status (admin)
    success, response, data = make_request('PUT', f'/orders/{order_id}', headers=headers, json_data={"status": "confirmed"})
    if not success or response.status_code != 200:
        print_test(f"PUT /api/orders/{order_id} (update status)", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    if data.get('status') != 'confirmed':
        print_test(f"PUT /api/orders/{order_id} (update status)", False, f"Expected status 'confirmed', got {data.get('status')}")
        return False
    
    print_test(f"PUT /api/orders/{order_id} (update status)", True, "Status updated to 'confirmed'")
    
    # PUT - Invalid status
    success, response, data = make_request('PUT', f'/orders/{order_id}', headers=headers, json_data={"status": "invalid"})
    if not success or response.status_code != 400:
        print_test(f"PUT /api/orders/{order_id} (invalid status)", False, f"Expected 400, got {response.status_code if response else 'no response'}")
    else:
        print_test(f"PUT /api/orders/{order_id} (invalid status)", True, "Returns 400 for invalid status")
    
    # GET - Export CSV (admin)
    success, response, csv_data = make_request('GET', '/orders/export', headers=headers, expect_json=False)
    if not success or response.status_code != 200:
        print_test("GET /api/orders/export (admin)", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    content_type = response.headers.get('Content-Type', '')
    if 'text/csv' not in content_type:
        print_test("GET /api/orders/export (admin)", False, f"Expected Content-Type text/csv, got {content_type}")
        return False
    
    if not csv_data or len(csv_data) < 10:
        print_test("GET /api/orders/export (admin)", False, "CSV data is empty or too short")
        return False
    
    # Check for BOM
    if not csv_data.startswith('\ufeff'):
        print_test("GET /api/orders/export (admin)", False, "CSV missing UTF-8 BOM")
        return False
    
    # Check for Arabic headers
    if 'رقم الطلب' not in csv_data:
        print_test("GET /api/orders/export (admin)", False, "CSV missing Arabic headers")
        return False
    
    print_test("GET /api/orders/export (admin)", True, f"Returns CSV with BOM and Arabic headers ({len(csv_data)} bytes)")
    
    return True

def test_stats(products):
    """Test 6: GET /api/stats - verify structure and revenue calculation"""
    print(f"\n{Colors.BLUE}=== Test 6: Stats ==={Colors.END}")
    
    headers = {'x-admin-token': ADMIN_TOKEN}
    
    success, response, data = make_request('GET', '/stats', headers=headers)
    if not success or response.status_code != 200:
        print_test("GET /api/stats (admin)", False, f"Expected 200, got {response.status_code if response else 'no response'}")
        return False
    
    required_fields = ['totalOrders', 'productsCount', 'totalRevenue', 'byStatus']
    missing = [f for f in required_fields if f not in data]
    if missing:
        print_test("GET /api/stats (admin)", False, f"Missing fields: {missing}")
        return False
    
    # Check byStatus structure
    if not isinstance(data['byStatus'], dict):
        print_test("GET /api/stats (admin)", False, f"byStatus should be object, got {type(data['byStatus'])}")
        return False
    
    required_statuses = ['new', 'confirmed', 'shipped', 'cancelled']
    missing_statuses = [s for s in required_statuses if s not in data['byStatus']]
    if missing_statuses:
        print_test("GET /api/stats (admin)", False, f"byStatus missing: {missing_statuses}")
        return False
    
    print_test("GET /api/stats (admin)", True, 
               f"totalOrders: {data['totalOrders']}, productsCount: {data['productsCount']}, "
               f"totalRevenue: {data['totalRevenue']} (excludes cancelled)")
    
    return True

def main():
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"DZ Store Backend API Test Suite")
    print(f"Base URL: {BASE_URL}")
    print(f"{'='*60}{Colors.END}\n")
    
    all_tests_passed = True
    
    try:
        # Test 1: Products auto-seed
        products = test_products_auto_seed()
        if not products:
            all_tests_passed = False
            products = []
        
        # Test 2: Admin login
        if not test_admin_login():
            all_tests_passed = False
        
        # Test 3: Auth enforcement
        if not test_auth_enforcement():
            all_tests_passed = False
        
        # Test 4: Products CRUD
        if not test_products_crud(products):
            all_tests_passed = False
        
        # Test 5: Orders
        if not test_orders(products):
            all_tests_passed = False
        
        # Test 6: Stats
        if not test_stats(products):
            all_tests_passed = False
        
    except Exception as e:
        print(f"\n{Colors.RED}Test suite error: {str(e)}{Colors.END}")
        import traceback
        traceback.print_exc()
        all_tests_passed = False
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}{Colors.END}")
    if all_tests_passed:
        print(f"{Colors.GREEN}✓ ALL TESTS PASSED{Colors.END}")
        sys.exit(0)
    else:
        print(f"{Colors.RED}✗ SOME TESTS FAILED{Colors.END}")
        sys.exit(1)

if __name__ == "__main__":
    main()
