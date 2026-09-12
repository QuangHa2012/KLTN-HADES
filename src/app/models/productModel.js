const { sql, connectDB } = require('../../config/db/db');


class ProductModel {
    // Lấy tất cả sản phẩm (chỉ lấy sp chưa bị xóa)
    async getAllProducts() {
        let pool = await connectDB();
        let result = await pool.request()
            .query("SELECT * FROM Products WHERE isDeleted = 0");
        return result.recordset;
    }
    // Lấy danh sách sản phẩm đã bị xóa (isDeleted = 1)
    async getDeletedProducts() {
        let pool = await connectDB();
        let result = await pool.request()
            .query("SELECT * FROM Products WHERE isDeleted = 1");
        return result.recordset;
    }

    // Lấy theo category
    async getProductsByCategory(category) {
        let pool = await connectDB();
        let result = await pool.request()
            .input('category', sql.NVarChar, category)
            .query("SELECT * FROM Products WHERE category = @category AND isDeleted = 0");
        return result.recordset;
    }

    // Lấy theo id
    async getProductById(id) {
        let pool = await connectDB();
        let result = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT * FROM Products WHERE id = @id AND isDeleted = 0");
        return result.recordset[0];
    }

    // Lấy sản phẩm theo id kèm ảnh
    async getProductWithImages(id) {
        let pool = await connectDB();

        // Lấy thông tin sản phẩm
        let productResult = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT * FROM Products WHERE id = @id AND isDeleted = 0");

        if (productResult.recordset.length === 0) return null;

        let product = productResult.recordset[0];

        // Lấy danh sách ảnh
        let imagesResult = await pool.request()
            .input('id', sql.Int, id)
            .query("SELECT img FROM ProductImages WHERE product_id = @id");

        product.images = imagesResult.recordset.map(row => row.img);

        return product;
    } 
    
    // Tạo mới sản phẩm
    async createProduct({ name, price, img, stock, category,des,gender }) {
        let pool = await connectDB();
        let result = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('price', sql.Decimal(18, 2), price)
            .input('img', sql.NVarChar, img || null)
            .input('stock', sql.Int, stock || 0)
            .input('category', sql.NVarChar, category || null)
            .input('des', sql.NVarChar(sql.MAX), des)
            .input('gender', sql.NVarChar, gender || null)
            .query(`
                INSERT INTO Products (name, price, img, stock, category, des,gender,isDeleted)
                OUTPUT INSERTED.id
                VALUES (@name, @price, @img, @stock, @category, @des,@gender,0)
            `);

        return result.recordset[0].id; // trả về id sản phẩm
    }

    // Cập nhật sản phẩm
    async updateProduct(id, { name, price, img, stock, category, des, gender }) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('price', sql.Decimal(18, 2), price)
            .input('img', sql.NVarChar, img)
            .input('stock', sql.Int, stock)
            .input('category', sql.NVarChar, category)
            .input('des', sql.NVarChar(sql.MAX), des)
            .input('gender', sql.NVarChar,  gender)
            .query(`
                UPDATE Products
                SET name = @name,
                    price = @price,
                    img = @img,
                    stock = @stock,
                    category = @category,
                    des = @des,
                    gender = @gender
                WHERE id = @id
            `);
    }

    // Thêm ảnh phụ
    async addImage(productId, imgUrl) {
        let pool = await connectDB();
        await pool.request()
            .input('product_id', sql.Int, productId)
            .input('img', sql.NVarChar, imgUrl)
            .query(`
                INSERT INTO ProductImages (product_id, img)
                VALUES (@product_id, @img)
            `);
    }

    // xóa ảnh sản phẩm
    async deleteImages(productId) {
        let pool = await connectDB();
        await pool.request()
            .input('product_id', sql.Int, productId)
            .query(`DELETE FROM ProductImages WHERE product_id = @product_id`);
    }

    // Xóa mềm sản phẩm
    async deleteProduct(id) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Products SET isDeleted = 1 WHERE id=@id");
    }

    // Khôi phục sản phẩm (set isDeleted = 0)
    async restoreProduct(id) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Products SET isDeleted = 0 WHERE id=@id");
    }

    // Xóa vĩnh viễn sản phẩm
    async deletePermanent(id) {
        let pool = await connectDB();
        await pool.request()
            .input('id', sql.Int, id)
            .query("DELETE FROM Products WHERE id=@id");
    }

    // Lấy sản phẩm với phân trang + sort + search + gender filter
    async getProductsPaginated(
        page = 1,
        limit = 8,
        sort = "newest",
        q = "",
        gender = "") {
        const pool = await connectDB();
        const offset = (page - 1) * limit;

        // SORT
        let orderBy = "ORDER BY id DESC";

        switch (sort) {
            case "oldest":
                orderBy = "ORDER BY id ASC";
                break;

            case "price_asc":
                orderBy = "ORDER BY price ASC";
                break;

            case "price_desc":
                orderBy = "ORDER BY price DESC";
                break;
        }

        // WHERE
        let whereConditions = [
            "isDeleted = 0"
        ];

        // SEARCH
        const keyword = q ? q.trim().toLowerCase() : "";

        if (keyword !== "") {

            // Từ khóa tìm kiếm được mở rộng
            const searchKeywords = this.expandSearchKeywords(keyword);

            // Tạo điều kiện:
            // name LIKE
            // OR des LIKE
            // OR category LIKE
            // OR gender LIKE
            const searchConditions = [];

            searchKeywords.forEach((word, index) => {

                const paramName = `search${index}`;

                searchConditions.push(`
                    (
                        LOWER(name) LIKE @${paramName}
                        OR LOWER(des) LIKE @${paramName}
                        OR LOWER(category) LIKE @${paramName}
                        OR LOWER(gender) LIKE @${paramName}
                    )
                `);
            });

            if (searchConditions.length > 0) {
                whereConditions.push(`
                    (${searchConditions.join(" OR ")})
                `);
            }
        }

        // GENDER FILTER
        if (gender && gender.trim() !== "") {

            if (gender === "male") {

                whereConditions.push(`
                    (gender = 'male' OR gender = 'unisex')
                `);

            } else if (gender === "female") {

                whereConditions.push(`
                    (gender = 'female' OR gender = 'unisex')
                `);

            } else if (gender === "unisex") {

                whereConditions.push(`
                    gender = 'unisex'
                `);
            }
        }

        // WHERE HOÀN CHỈNH
        const whereClause = `
            WHERE ${whereConditions.join(" AND ")}
        `;

        // REQUEST LẤY SẢN PHẨM
        const request = pool.request()
            .input("offset", sql.Int, offset)
            .input("limit", sql.Int, limit);

        // Bind keyword
        if (keyword !== "") {

            const searchKeywords = this.expandSearchKeywords(keyword);

            searchKeywords.forEach((word, index) => {

                request.input(
                    `search${index}`,
                    sql.NVarChar,
                    `%${word}%`
                );
            });
        }

        // LẤY SẢN PHẨM
    
        const result = await request.query(`
            SELECT *
            FROM Products
            ${whereClause}
            ${orderBy}
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);

        // REQUEST ĐẾM TOTAL
        const countRequest = pool.request();

        if (keyword !== "") {

            const searchKeywords = this.expandSearchKeywords(keyword);

            searchKeywords.forEach((word, index) => {

                countRequest.input(
                    `search${index}`,
                    sql.NVarChar,
                    `%${word}%`
                );
            });
        }

        const countResult = await countRequest.query(`
            SELECT COUNT(*) AS total
            FROM Products
            ${whereClause}
        `);

        return {
            products: result.recordset,
            total: countResult.recordset[0].total
        };
    }



    // Lấy sản phẩm theo category với phân trang
    async getProductsByCategoryPaginated(
        category,
        page = 1,
        limit = 8,
        sort = "newest",
        q = "",
        gender = "") {
        const pool = await connectDB();

        const offset = (page - 1) * limit;

        // SORT
        let orderBy = "ORDER BY id DESC";

        switch (sort) {
            case "oldest":
                orderBy = "ORDER BY id ASC";
                break;

            case "price_asc":
                orderBy = "ORDER BY price ASC";
                break;

            case "price_desc":
                orderBy = "ORDER BY price DESC";
                break;
        }

        // WHERE
        const whereConditions = [
            "category = @category",
            "isDeleted = 0"
        ];

        // SEARCH
        const keyword = q ? q.trim().toLowerCase() : "";

        if (keyword !== "") {

            const searchKeywords = this.expandSearchKeywords(keyword);

            const searchConditions = [];

            searchKeywords.forEach((word, index) => {

                const paramName = `search${index}`;

                searchConditions.push(`
                    (
                        LOWER(name) LIKE @${paramName}
                        OR LOWER(des) LIKE @${paramName}
                        OR LOWER(category) LIKE @${paramName}
                        OR LOWER(gender) LIKE @${paramName}
                    )
                `);
            });

            if (searchConditions.length > 0) {
                whereConditions.push(`
                    (${searchConditions.join(" OR ")})
                `);
            }
        }

        // GENDER
        if (gender && gender.trim() !== "") {

            if (gender === "male") {

                whereConditions.push(`
                    (gender = 'male' OR gender = 'unisex')
                `);

            } else if (gender === "female") {

                whereConditions.push(`
                    (gender = 'female' OR gender = 'unisex')
                `);

            } else if (gender === "unisex") {

                whereConditions.push(`
                    gender = 'unisex'
                `);
            }
        }

        const whereClause = `
            WHERE ${whereConditions.join(" AND ")}
        `;

        // REQUEST LẤY DATA
        const request = pool.request()
            .input("category", sql.NVarChar, category)
            .input("offset", sql.Int, offset)
            .input("limit", sql.Int, limit);

        // Bind search parameters
        if (keyword !== "") {

            const searchKeywords = this.expandSearchKeywords(keyword);

            searchKeywords.forEach((word, index) => {

                request.input(
                    `search${index}`,
                    sql.NVarChar,
                    `%${word}%`
                );
            });
        }

        // LẤY SẢN PHẨM
        const result = await request.query(`
            SELECT *
            FROM Products
            ${whereClause}
            ${orderBy}
            OFFSET @offset ROWS
            FETCH NEXT @limit ROWS ONLY
        `);

        // COUNT
        const countRequest = pool.request()
            .input("category", sql.NVarChar, category);

        if (keyword !== "") {

            const searchKeywords = this.expandSearchKeywords(keyword);

            searchKeywords.forEach((word, index) => {

                countRequest.input(
                    `search${index}`,
                    sql.NVarChar,
                    `%${word}%`
                );
            });
        }

        const countResult = await countRequest.query(`
            SELECT COUNT(*) AS total
            FROM Products
            ${whereClause}
        `);

        return {
            products: result.recordset,
            total: countResult.recordset[0].total
        };
    }

    // MỞ RỘNG TỪ KHÓA TÌM KIẾM
    expandSearchKeywords(keyword) {

        const synonyms = {

            // ÁO
            "áo": [
                "áo",
                "shirt",
                "tshirt",
                "t-shirt",
                "polo",
                "hoodie",
                "sweater"
            ],

            // HOODIE
            "hoodie": [
                "hoodie",
                "áo hoodie",
                "áo nỉ"
            ],

            // ÁO KHOÁC
            "áo khoác": [
                "áo khoác",
                "jacket",
                "bomber",
                "coat",
                "outerwear"
            ],

            "jacket": [
                "jacket",
                "áo khoác",
                "bomber",
                "outerwear"
            ],

            // QUẦN
            "quần": [
                "quần",
                "pants",
                "jean",
                "jeans",
                "shorts"
            ],

            "jean": [
                "jean",
                "jeans",
                "quần"
            ],

            "jeans": [
                "jean",
                "jeans",
                "quần"
            ],

            // TÚI
            "túi": [
                "túi",
                "bag",
                "backpack"
            ],

            "balo": [
                "balo",
                "backpack",
                "bag"
            ],

            // PHỤ KIỆN
            "phụ kiện": [
                "phụ kiện",
                "accessory"
            ],

            // GIỚI TÍNH
            "nam": [
                "nam",
                "male",
                "men"
            ],

            "nữ": [
                "nữ",
                "female",
                "women"
            ],

            "unisex": [
                "unisex"
            ]
        };

        const results = [];

        // 1. Kiểm tra cả cụm từ
        if (synonyms[keyword]) {
            results.push(...synonyms[keyword]);
        }

        // 2. Kiểm tra từng từ
        const words = keyword.split(/\s+/);

        words.forEach(word => {

            if (synonyms[word]) {
                results.push(...synonyms[word]);
            } else {
                results.push(word);
            }
        });

        // 3. Loại bỏ trùng
        return [...new Set(results)];
    }

    // Tìm kiếm có phân trang (after search)
    async searchProducts(keyword, page = 1, limit = 8) {
        let pool = await connectDB();

        const offset = (page - 1) * limit;

        // Đếm tổng sản phẩm
        const countResult = await pool.request()
            .input('keyword', sql.NVarChar, `%${keyword}%`)
            .query("SELECT COUNT(*) as total FROM Products WHERE isDeleted = 0 AND name LIKE @keyword");

        const total = countResult.recordset[0].total;

        // Lấy sản phẩm theo phân trang
        const result = await pool.request()
            .input('keyword', sql.NVarChar, `%${keyword}%`)
            .input('limit', sql.Int, limit)
            .input('offset', sql.Int, offset)
            .query(`
                SELECT * FROM Products
                WHERE isDeleted = 0 AND name LIKE @keyword
                ORDER BY id DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);

        return {
            products: result.recordset,
            total
        };
    }

    async updateAverageRating(productId, avgRating) {
        const pool = await connectDB();
        await pool.request()
            .input("id", sql.Int, productId)
            .input("avgRating", sql.Float, avgRating)
            .query(`
                UPDATE Products
                SET averageRating = @avgRating
                WHERE id = @id
            `);
    }

    // Thay đổi số lượng trong kho
    async changeStock(productId, delta) {
        const pool = await connectDB();
        await pool.request()
            .input("productId", sql.Int, productId)
            .input("delta", sql.Int, delta)
            .query(`
                UPDATE Products
                SET stock = CASE 
                    WHEN stock + @delta < 0 THEN 0
                    ELSE stock + @delta
                END
                WHERE id = @productId
            `);
    }

    async hasUserPurchased(userId, productId) {
        let pool = await connectDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .input('productId', sql.Int, productId)
            .query(`
                SELECT COUNT(*) AS count
                FROM Orders o
                JOIN OrderItems oi ON o.id = oi.order_id
                WHERE o.user_id = @userId 
                AND oi.product_id = @productId 
                AND o.status IN ('completed', 'paid')
            `);
        return result.recordset?.[0]?.count > 0;
    }



}

module.exports = new ProductModel();//bên controller gọi hàm này