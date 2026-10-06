/**
 * Pagination helper module.
 *
 * NOTE: This is an incomplete/buggy fixture implementation intended for
 * task-evaluation benchmarks.
 */

function paginate(items, options) {
  // BUG: Does not validate that `items` is an Array (should throw TypeError).
  options = options || {};

  var page = options.page !== undefined ? options.page : 1;
  var pageSize = options.pageSize !== undefined ? options.pageSize : 10;
  // BUG: Does not cap pageSize at maxPageSize (default: 100).
  // BUG: Does not clamp or normalize invalid/negative page or pageSize.

  var totalItems = items ? items.length : 0;
  // BUG: For empty items [], returns totalPages: 0 is expected, but naive division
  // might yield 0, but logic below doesn't handle page bounds properly.
  var totalPages = Math.ceil(totalItems / pageSize);

  var startIndex = (page - 1) * pageSize;
  var endIndex = startIndex + pageSize;
  var data = items ? items.slice(startIndex, endIndex) : [];

  return {
    data: data,
    pagination: {
      page: page,
      pageSize: pageSize,
      totalItems: totalItems,
      totalPages: totalPages,
      // BUG: Incorrect calculation when totalPages is 0 or page > totalPages
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

module.exports = { paginate };
