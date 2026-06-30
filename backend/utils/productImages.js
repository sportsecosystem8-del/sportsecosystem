/** Primary image path from a product document */
function productPrimaryImagePath(product) {
  if (!product) return null;
  const arr = product.images || [];
  if (!arr.length) return null;
  const i = typeof product.primaryImageIndex === 'number' ? product.primaryImageIndex : 0;
  return arr[i] || arr[0] || null;
}

/** Attach imagePath to order line items when missing (legacy orders). */
async function enrichOrderItemsWithImages(orders, Product) {
  if (!orders?.length) return orders;
  const productIds = [
    ...new Set(
      orders.flatMap((o) => (o.items || []).filter((i) => i.product).map((i) => String(i.product)))
    ),
  ];
  if (!productIds.length) return orders;

  const products = await Product.find({ _id: { $in: productIds } })
    .select('name description category sportType price images primaryImageIndex')
    .lean();
  const byId = Object.fromEntries(products.map((p) => [String(p._id), p]));

  return orders.map((o) => ({
    ...o,
    items: (o.items || []).map((item) => {
      const prod = byId[String(item.product)];
      return {
        ...item,
        imagePath: item.imagePath || productPrimaryImagePath(prod) || null,
        description: item.description || prod?.description || '',
        category: item.category || prod?.category || '',
        sportType: item.sportType || prod?.sportType || '',
        listPrice: item.listPrice ?? prod?.price ?? item.unitPrice,
      };
    }),
  }));
}

module.exports = { productPrimaryImagePath, enrichOrderItemsWithImages };
