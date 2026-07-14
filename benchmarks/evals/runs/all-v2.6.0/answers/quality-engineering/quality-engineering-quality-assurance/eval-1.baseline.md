Assumptions: Sales Reps and Customers have different cart rules, but exact differences were not provided. The cases below assume both can add products, with role-specific cart behavior or pricing.

| ID | Test case | Preconditions | Steps | Expected result |
|---|---|---|---|---|
| ATC-01 | Sales Rep sees Add to Cart on Mobile | Logged in as Sales Rep; product is available | Open Product Detail on a mobile device | Add to Cart button is visible and enabled |
| ATC-02 | Sales Rep adds product to cart | Logged in as Sales Rep; product is available | Tap Add to Cart | Product is added according to Sales Rep rules; confirmation is shown; cart count updates |
| ATC-03 | Sales Rep receives correct cart details | Sales Rep has added a product | Open the cart | Product, quantity, pricing, discounts, and availability match Sales Rep rules |
| ATC-04 | Customer sees Add to Cart on Mobile | Logged in as Customer; product is available | Open Product Detail on a mobile device | Add to Cart button is visible and enabled |
| ATC-05 | Customer adds product to cart | Logged in as Customer; product is available | Tap Add to Cart | Product is added according to Customer rules; confirmation is shown; cart count updates |
| ATC-06 | Customer receives correct cart details | Customer has added a product | Open the cart | Product, quantity, pricing, discounts, and availability match Customer rules |
| ATC-07 | Role-specific behavior is enforced | Test accounts exist for both roles | Add the same product as a Sales Rep, then as a Customer | Each role receives only its permitted cart behavior, pricing, discounts, and validations |
| ATC-08 | Repeated tap handling | Logged in on Mobile; product is available | Tap Add to Cart repeatedly or quickly | No unintended duplicate additions occur unless multiple additions are explicitly supported |
| ATC-09 | Out-of-stock product handling | Product is unavailable | Open Product Detail on Mobile | Add to Cart is hidden or disabled, and the correct availability message is shown |
| ATC-10 | Add to Cart is unavailable on Web | Logged in as Sales Rep or Customer | Open the same Product Detail screen in a desktop browser | Add to Cart is not available on Web, and no cart action can be triggered |
| ATC-11 | Mobile layout and accessibility | Logged in as either role | Rotate the device and use supported screen sizes; navigate using accessibility controls | Button remains usable, correctly labeled, visible, and does not overlap other controls |
| ATC-12 | Add-to-cart failure handling | Simulate network or server failure | Tap Add to Cart | Product is not incorrectly added; an error message is shown; the user can retry |
