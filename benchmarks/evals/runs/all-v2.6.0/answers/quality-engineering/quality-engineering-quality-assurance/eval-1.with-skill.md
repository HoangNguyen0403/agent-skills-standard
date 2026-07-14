Assumptions: On Mobile, a Sales Rep adds the product to the selected customer’s cart; a Customer adds it to their own cart. The product is in stock, and the user is authenticated.

`1 Test Case = 1 Condition` and `No "OR" Logic`; divergent role and platform behavior is split into separate TCs.

### TC-01

**Name:** `Mobile_Product_Add to Cart on Product Detail when user is a Sales Rep`  
**Priority:** High — Critical path

**Preconditions:**

- User is authenticated as a Sales Rep.
- A customer account is selected.
- Product is in stock.

**Steps:**

1. Open the Product Detail screen on Mobile.
2. Tap **Add to Cart**.

**Expected result:**

- The product is added with quantity `1`.
- The item is added to the selected customer’s cart.
- A cart confirmation is displayed.

### TC-02

**Name:** `Mobile_Product_Add to Cart on Product Detail when user is a Customer`  
**Priority:** High — Critical path

**Preconditions:**

- User is authenticated as a Customer.
- Product is in stock.

**Steps:**

1. Open the Product Detail screen on Mobile.
2. Tap **Add to Cart**.

**Expected result:**

- The product is added with quantity `1`.
- The item is added to the Customer’s own cart.
- A cart confirmation is displayed.

### TC-03

**Name:** `Mobile_Product_Verify Add to Cart availability on Product Detail when platform is Mobile`  
**Priority:** High — Critical path

**Steps:**

1. Open an in-stock product’s Product Detail screen on Mobile.

**Expected result:**

- The **Add to Cart** button is visible and enabled.

### TC-04

**Name:** `Web_Product_Verify Add to Cart availability on Product Detail when platform is Web`  
**Priority:** Normal — Standard platform validation

**Steps:**

1. Open the same in-stock product’s Product Detail screen on Web.

**Expected result:**

- The **Add to Cart** button is unavailable according to product behavior, such as hidden or disabled.
- The product cannot be added to a cart from the Web Product Detail screen.

If the actual Sales Rep or Customer behavior differs from the assumption above, update the expected results while preserving the `Module_Action on Screen when Condition` naming convention. No Low-priority cases are included because Low is reserved for cosmetic validation.
