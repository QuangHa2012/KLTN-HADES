const { sql, connectDB } = require('../../config/db/db');

function formatPrice(value) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

class CartController {
    //  /carts/add/:id
    async addToCart(req, res) {
        const userId = req.session.user?.id;
        const productId = req.params.id;
        const quantity = 1;

        if (!userId) {
            return res.redirect('/accounts/login');
        }

        try {
            const pool = await connectDB();

            // check cart 
            let cartResult = await pool.request()
                .input('userId', sql.Int, userId)
                .query('SELECT * FROM Carts WHERE user_id = @userId');

            let cartId;
            if (cartResult.recordset.length === 0) {
                let newCart = await pool.request()
                    .input('userId', sql.Int, userId)
                    .query('INSERT INTO Carts (user_id) OUTPUT INSERTED.id VALUES (@userId)');
                cartId = newCart.recordset[0].id;
            } else {
                cartId = cartResult.recordset[0].id;
            }

            // check inventory 
            let productResult = await pool.request()
                .input("productId", sql.Int, productId)
                .query("SELECT stock FROM Products WHERE id = @productId AND isDeleted = 0");

            if (productResult.recordset.length === 0) {
                return res.redirect("/carts");
            }

            const stock = productResult.recordset[0].stock;

            // kiểm tra đã có trong giỏ chưa
            let itemResult = await pool.request()
                .input('cartId', sql.Int, cartId)
                .input('productId', sql.Int, productId)
                .query('SELECT quantity FROM CartItems WHERE cart_id=@cartId AND product_id=@productId');

            if (itemResult.recordset.length > 0) {
                const currentQty = itemResult.recordset[0].quantity;

                //  Nếu vượt tồn kho → không thêm
                if (currentQty + 1 > stock) {
                    req.session.cartError = "Số lượng vượt quá tồn kho!";
                    return res.redirect("/carts");
                }

                await pool.request()
                    .input('cartId', sql.Int, cartId)
                    .input('productId', sql.Int, productId)
                    .query('UPDATE CartItems SET quantity = quantity + 1 WHERE cart_id=@cartId AND product_id=@productId');
            } else {

                if (1 > stock) {
                    req.session.cartError = "Sản phẩm đã hết hàng!";
                    return res.redirect("/carts");
                }

                await pool.request()
                    .input('cartId', sql.Int, cartId)
                    .input('productId', sql.Int, productId)
                    .input('quantity', sql.Int, quantity)
                    .query('INSERT INTO CartItems (cart_id, product_id, quantity) VALUES (@cartId, @productId, @quantity)');
            }

            res.redirect('/carts');

        } catch (err) {
            console.error(err);
            res.status(500).render('500', {message:'Lỗi khi thêm sản phẩm vào giỏ hàng'});
        }
    }


    //  /carts  
    async viewCart(req, res) {
        const userId = req.session.user?.id;
        if (!userId) return res.redirect('/accounts/login');

        try {
            const pool = await connectDB();

            let result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT ci.id as cartItemId, p.id as productId, p.name, p.price, p.img, ci.quantity
                    FROM Carts c
                    JOIN CartItems ci ON c.id = ci.cart_id
                    JOIN Products p ON ci.product_id = p.id
                    WHERE c.user_id = @userId
                `);

            const items = result.recordset;

            let total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

            const discountResult = await pool.request()
                .input("total", sql.Decimal(18,2), total)
                .query(`
                    SELECT TOP 1 discountPercent
                    FROM DiscountRules
                    WHERE @total >= minTotal AND active = 1
                    ORDER BY minTotal DESC
                `);

            let discountPercent = 0;
            if (discountResult.recordset.length > 0) {
                discountPercent = discountResult.recordset[0].discountPercent;
            }

            const discountAmount = total * discountPercent / 100;
            const finalTotal = total - discountAmount;

            res.render('cart', { 
                items,
                total,
                discountPercent,
                discountAmount,
                finalTotal
            });

        } catch (err) {
            console.error(err);
            res.status(500).render('500', {message:'Lỗi khi tải giỏ hàng'});
        }
    }

    // PUT /carts/update/:id
    async updateQuantity(req, res) {
        const userId = req.session.user?.id;
        const cartItemId = req.params.id;
        const { quantity } = req.body;

        if (!userId) return res.json({success:false});

        try {
            const pool = await connectDB();

            // lấy product_id + quantity hiện tại
            let itemInfo = await pool.request()
                .input('cartItemId', sql.Int, cartItemId)
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT ci.product_id, ci.quantity, p.stock
                    FROM CartItems ci
                    JOIN Carts c ON ci.cart_id = c.id
                    JOIN Products p ON p.id = ci.product_id
                    WHERE ci.id = @cartItemId AND c.user_id = @userId
                `);

            if (itemInfo.recordset.length === 0) {
                return res.json({success:false});
            }

            const { product_id, stock } = itemInfo.recordset[0];

            // ❗ kiểm tra vượt stock
            if (quantity > stock) {
                return res.json({
                    success: false,
                    error: "Số lượng vượt quá tồn kho!",
                    maxStock: stock
                });
            }

            // nếu quantity <= 0 → xóa
            if(quantity <= 0){
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('cartItemId', sql.Int, cartItemId)
                    .query(`
                        DELETE ci
                        FROM CartItems ci
                        JOIN Carts c ON ci.cart_id = c.id
                        WHERE ci.id = @cartItemId AND c.user_id = @userId
                    `);
            } else {
                await pool.request()
                    .input('userId', sql.Int, userId)
                    .input('cartItemId', sql.Int, cartItemId)
                    .input('quantity', sql.Int, quantity)
                    .query(`
                        UPDATE ci
                        SET ci.quantity = @quantity
                        FROM CartItems ci
                        JOIN Carts c ON ci.cart_id = c.id
                        WHERE ci.id = @cartItemId AND c.user_id = @userId
                    `);
            }

            // == tính lại tổng các loại ==
            let result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT ci.id as cartItemId, p.price, ci.quantity
                    FROM Carts c
                    JOIN CartItems ci ON c.id = ci.cart_id
                    JOIN Products p ON ci.product_id = p.id
                    WHERE c.user_id = @userId
                `);

            const items = result.recordset;
            let total = items.reduce((s, i) => s + i.price * i.quantity, 0);

            let discountResult = await pool.request()
                .input("total", sql.Decimal(18,2), total)
                .query(`
                    SELECT TOP 1 discountPercent
                    FROM DiscountRules
                    WHERE @total >= minTotal AND active = 1
                    ORDER BY minTotal DESC
                `);

            let discountPercent = 0;
            if (discountResult.recordset.length > 0) {
                discountPercent = discountResult.recordset[0].discountPercent;
            }

            const discountAmount = total * discountPercent / 100;
            const finalTotal = total - discountAmount;

            let itemTotal = items.find(i => i.cartItemId == cartItemId);

            res.json({
                success: true,
                itemTotalFormatted: itemTotal ? formatPrice(itemTotal.price * itemTotal.quantity) : "0 ₫",
                totalFormatted: formatPrice(total),
                discountPercent,
                discountAmountFormatted: formatPrice(discountAmount),
                finalTotalFormatted: formatPrice(finalTotal),
                removeRow: quantity <= 0
            });

        } catch (err) {
            console.error(err);
            res.json({success:false});
        }
    }


    // DELETE /carts/remove/:id
    async removeItem(req, res){
        const userId = req.session.user?.id;
        const cartItemId = req.params.id;

        if(!userId) return res.json({success:false});

        try{
            const pool = await connectDB();
            await pool.request()
                .input('userId', sql.Int, userId)
                .input('cartItemId', sql.Int, cartItemId)
                .query(`
                    DELETE ci
                    FROM CartItems ci
                    JOIN Carts c ON ci.cart_id = c.id
                    WHERE ci.id = @cartItemId AND c.user_id = @userId
                `);

            // tính lại tổng tiền
            let result = await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    SELECT ci.id as cartItemId, p.price, ci.quantity
                    FROM Carts c
                    JOIN CartItems ci ON c.id = ci.cart_id
                    JOIN Products p ON ci.product_id = p.id
                    WHERE c.user_id = @userId
                `);

            const items = result.recordset;
            let total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

            const discountResult = await pool.request()
                .input("total", sql.Decimal(18,2), total)
                .query(`
                    SELECT TOP 1 discountPercent
                    FROM DiscountRules
                    WHERE @total >= minTotal AND active = 1
                    ORDER BY minTotal DESC
                `);

            let discountPercent = 0;
            if(discountResult.recordset.length > 0){
                discountPercent = discountResult.recordset[0].discountPercent;
            }

            const discountAmount = total * discountPercent / 100;
            const finalTotal = total - discountAmount;

            res.json({
                success:true,
                totalFormatted: new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(total),
                discountPercent,
                discountAmountFormatted: new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(discountAmount),
                finalTotalFormatted: new Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'}).format(finalTotal)
            });

        } catch(err){
            console.error(err);
            res.json({success:false});
        }
    }

    // DELETE /carts/clear
    async clearCart(req, res){
        const userId = req.session.user?.id;
        if(!userId) return res.json({success:false});

        try{
            const pool = await connectDB();
            await pool.request()
                .input('userId', sql.Int, userId)
                .query(`
                    DELETE ci
                    FROM CartItems ci
                    JOIN Carts c ON ci.cart_id = c.id
                    WHERE c.user_id = @userId
                `);

            res.json({
                success:true,
                totalFormatted: '0 ₫',
                discountPercent: 0,
                discountAmountFormatted: '0 ₫',
                finalTotalFormatted: '0 ₫'
            });

        } catch(err){
            console.error(err);
            res.json({success:false});
        }
    }


    

}

module.exports = new CartController();
