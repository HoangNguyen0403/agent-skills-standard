Below is a draft set of atomic cases for the stated scope. Replace placeholders with the project’s exact selectors, invoice contract, and expected file name.

1. `Web_VN Customer sees invoice download on Order Detail when invoice is available`
   - Preconditions: authenticated Customer in VN; order has an available invoice; Web is used.
   - Steps: open the Order Detail screen and inspect the invoice action.
   - Expected: the invoice download action is visible and enabled.

2. `Web_VN Customer downloads invoice on Order Detail when action is selected`
   - Preconditions: authenticated Customer in VN; order has an available invoice; Web is used.
   - Steps: select the invoice download action.
   - Expected: the correct invoice downloads successfully in the agreed file format and belongs to the selected order.

3. `Web_non-VN Customer does not see invoice download on Order Detail`
   - Preconditions: authenticated Customer outside VN; comparable order data; Web is used.
   - Steps: open Order Detail.
   - Expected: the invoice download action is hidden or disabled according to the AC.

4. `Mobile_VN Customer does not see Web-only invoice download on Order Detail`
   - Preconditions: authenticated Customer in VN; invoice available; Mobile is used.
   - Steps: open Order Detail.
   - Expected: the Web-only action is unavailable.

5. `Web_VN Customer sees defined empty state when invoice is unavailable`
   - Preconditions: authenticated Customer in VN; selected order has no invoice.
   - Steps: open Order Detail.
   - Expected: the agreed unavailable/empty behavior is shown and no invalid download is started.

Add cases for download failure, authorization, expired session, and localization if those are part of the story’s ACs.
