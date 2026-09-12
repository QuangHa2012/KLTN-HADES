const Product = require('../models/productModel');
const ProductReview = require("../models/productReviewModel");

class ProductController {
    // Hiển thị danh sách sản phẩm GET /products
    async listProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;
            const sort = req.query.sort || "newest";
            const q = typeof req.query.q === "string" ? req.query.q : "";
            const gender = typeof req.query.gender === "string" ? req.query.gender : "";

            const { products, total } = await Product.getProductsPaginated(page, limit, sort, q, gender);

            const totalPages = Math.ceil(total / limit);

            res.render("products", {
                products,
                currentPage: page,
                totalPages,
                sort,
                q,
                gender
            });
        } catch (error) {
            console.error("❌ Lỗi khi lấy sản phẩm:", error);
            res.status(500).render("500", { message: "Lỗi server khi tải danh sách sản phẩm" });
        }
    }
    
    // GET /products/top
    async getTopProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;

            const sort = req.query.sort || "newest";

            const q = typeof req.query.q === "string"
                ? req.query.q
                : "";

            const gender = typeof req.query.gender === "string"
                ? req.query.gender
                : "";

            const { products, total } =
                await Product.getProductsByCategoryPaginated(
                    "top",
                    page,
                    limit,
                    sort,
                    q,
                    gender
                );

            const totalPages = Math.ceil(total / limit);

            res.render("products", {
                products,
                currentPage: page,
                totalPages,
                category: "top",
                sort,
                q,
                gender
            });

        } catch (error) {

            console.error("❌ Lỗi lấy sản phẩm top:", error);

            res.status(500).render("500", {
                message: "Lỗi server khi tải sản phẩm"
            });
        }
    }
    // GET /products/bottom
    async getBottomProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;

            const sort = req.query.sort || "newest";

            const q = typeof req.query.q === "string"
                ? req.query.q
                : "";

            const gender = typeof req.query.gender === "string"
                ? req.query.gender
                : "";

            const { products, total } =
                await Product.getProductsByCategoryPaginated(
                    "bottom",
                    page,
                    limit,
                    sort,
                    q,
                    gender
                );

            const totalPages = Math.ceil(total / limit);

            res.render("products", {
                products,
                currentPage: page,
                totalPages,
                category: "bottom",
                sort,
                q,
                gender
            });

        } catch (error) {

            console.error("❌ Lỗi lấy sản phẩm bottom:", error);

            res.status(500).render("500", {
                message: "Lỗi server khi tải sản phẩm"
            });
        }
    }

    // GET /products/outerwears
    async getOuterwearsProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;

            const sort = req.query.sort || "newest";

            const q = typeof req.query.q === "string"
                ? req.query.q
                : "";

            const gender = typeof req.query.gender === "string"
                ? req.query.gender
                : "";

            const { products, total } =
                await Product.getProductsByCategoryPaginated(
                    "outerwear",
                    page,
                    limit,
                    sort,
                    q,
                    gender
                );

            const totalPages = Math.ceil(total / limit);

            res.render("products", {
                products,
                currentPage: page,
                totalPages,
                category: "outerwear",
                sort,
                q,
                gender
            });

        } catch (error) {

            console.error("❌ Lỗi lấy sản phẩm outerwear:", error);

            res.status(500).render("500", {
                message: "Lỗi server khi tải sản phẩm"
            });
        }
    }

    // GET /products/accessories
    async getAccessoriesProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;

            const sort = req.query.sort || "newest";

            const q = typeof req.query.q === "string"
                ? req.query.q
                : "";

            const gender = typeof req.query.gender === "string"
                ? req.query.gender
                : "";

            const { products, total } =
                await Product.getProductsByCategoryPaginated(
                    "accessory",
                    page,
                    limit,
                    sort,
                    q,
                    gender
                );

            const totalPages = Math.ceil(total / limit);

            res.render("products", {
                products,
                currentPage: page,
                totalPages,
                category: "accessory",
                sort,
                q,
                gender
            });

        } catch (error) {

            console.error("❌ Lỗi lấy sản phẩm accessory:", error);

            res.status(500).render("500", {
                message: "Lỗi server khi tải sản phẩm"
            });
        }
    }

    // GET /products/bags
    async getBagsProducts(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;

            const sort = req.query.sort || "newest";

            const q = typeof req.query.q === "string"
                ? req.query.q
                : "";

            const gender = typeof req.query.gender === "string"
                ? req.query.gender
                : "";

            const { products, total } =
                await Product.getProductsByCategoryPaginated(
                    "bag",
                    page,
                    limit,
                    sort,
                    q,
                    gender
                );

            const totalPages = Math.ceil(total / limit);

            res.render("products", {
                products,
                currentPage: page,
                totalPages,
                category: "bag",
                sort,
                q,
                gender
            });

        } catch (error) {

            console.error("❌ Lỗi lấy sản phẩm bag:", error);

            res.status(500).render("500", {
                message: "Lỗi server khi tải sản phẩm"
            });
        }
    }


    // [GET] /admin/products
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = 8;
            const q = req.query.q ? req.query.q.trim() : "";

            let data;

            // Nếu có từ khóa tìm kiếm thì dùng searchProducts
            if (q) {
                data = await Product.searchProducts(q, page, limit);
            } else {
                data = await Product.getProductsPaginated(page, limit);
            }

            const totalPages = Math.ceil(data.total / limit);

            res.render('admin/products/index', {
                products: data.products,
                currentPage: page,
                totalPages,
                q // giữ lại từ khóa để hiển thị trong ô tìm kiếm
            });
        } catch (err) {
            console.error(err);
            res.status(500).render('500', {message:'Lỗi khi tải danh sách sản phẩm'});
        }
    }

    // [GET] /admin/products/create
    create(req, res) {
        res.render('admin/products/create');
    }

    // [POST] /admin/products/store
    async store(req, res) {
        try {
            const { name, price, img, stock, category, extraImages, des, gender } = req.body;

            // B1: thêm sản phẩm
            const productId = await Product.createProduct({ name, price, img, stock, category, des, gender });

            // B2: thêm ảnh chính vào ProductImages
            if (img && img.trim() !== "") {
                await Product.addImage(productId, img.trim());
            }

            // B3: nếu có ảnh phụ -> thêm vào ProductImages
            if (extraImages && extraImages.trim() !== "") {
                const images = extraImages.split(",").map(i => i.trim());
                for (let image of images) {
                    if (image) {
                        await Product.addImage(productId, image);
                    }
                }
            }

            res.redirect('/admin/products');
        } catch (err) {
            console.error(err);
            res.status(500).render('500', {message:'Lỗi khi thêm sản phẩm'});
        }
    }


    // [GET] /admin/products/:id/edit
    async edit(req, res) {
        try {
            const product = await Product.getProductById(req.params.id);
            res.render('admin/products/edit', { product });
        } catch (err) {
            res.status(500).render('500', {message:'Lỗi khi tải trang chỉnh sửa sản phẩm'});
        }
    }

    // [POST] /admin/products/:id/update
    async update(req, res) {
        try {
            const { name, price, img, stock, category, extraImages, des, gender } = req.body;
            const productId = req.params.id;

            //update bảng Products
            await Product.updateProduct(productId, { name, price, img, stock, category, des, gender });

            //xóa hết ảnh cũ
            await Product.deleteImages(productId);

            //thêm lại ảnh chính
            if (img && img.trim() !== "") {
                await Product.addImage(productId, img.trim());
            }

            //thêm lại ảnh phụ
            if (extraImages && extraImages.trim() !== "") {
                const images = extraImages.split(",").map(i => i.trim());
                for (let image of images) {
                    if (image) {
                        await Product.addImage(productId, image);
                    }
                }
            }

            res.redirect('/admin/products');
        } catch (err) {
            console.error(err);
            res.status(500).render('500', {message:'Lỗi khi cập nhật sản phẩm'});
        }
    }

    // [POST] /admin/products/:id/delete
    async delete(req, res) {
        try {
            await Product.deleteProduct(req.params.id);
            res.redirect('/admin/products');
        } catch (err) {
            res.status(500).render('500', {message:'Lỗi khi xóa sản phẩm'});
        }
    }

    // [GET] /admin/products/trash
    async trash(req, res) {
        try {
            const products = await Product.getDeletedProducts();
            res.render('admin/products/trash', { products });
        } catch (err) {
            res.status(500).render('500', {message:'Lỗi khi lấy danh sách sản phẩm đã xóa'});
        }
    }

    // [POST] /admin/products/:id/restore
    async restore(req, res) {
        try {
            await Product.restoreProduct(req.params.id);
            res.redirect('/admin/products/trash');
        } catch (err) {
            res.status(500).render('500', {message:'Lỗi khi khôi phục sản phẩm'});
        }
    }

    // [POST] /admin/products/:id/delete-permanent
    async deletePermanent(req, res) {
        try {
            await Product.deletePermanent(req.params.id);
            res.redirect('/admin/products/trash');
        } catch (err) {
            res.status(500).render('500', {message:'Lỗi khi xóa vĩnh viễn sản phẩm'});
        }
    }

    // [GET] /products/:id
    async detail(req, res) {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) return res.status(400).render("404", { message: "ID sản phẩm không hợp lệ" });

            const product = await Product.getProductWithImages(id);
            if (!product) return res.status(404).render("404", { message: "Sản phẩm không tồn tại" });

            const reviews = await ProductReview.getReviewsByProductId(id);
            const totalReviews = reviews.length;
            const averageRating = totalReviews > 0
                ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews).toFixed(2)
                : 0;

            // Lấy review của user hiện tại (nếu đã đăng nhập)
            let userReview = null;
            let hasUserPurchased = false;
            if (req.session.user) {
                const user = req.session.user;
                userReview = await ProductReview.getUserReview(id, user.id);

                // Nếu user không phải admin → kiểm tra đã mua chưa
                if (user.role !== 'admin') {
                    hasUserPurchased = await Product.hasUserPurchased(user.id, id);
                } else {
                    hasUserPurchased = true;
                }
            }

            res.render("productDetail", {
                product,
                reviews,
                totalReviews,
                averageRating,
                user: req.session.user || null,
                userReview,
                hasUserPurchased
            });

        } catch (error) {
            console.error("❌ Lỗi khi lấy chi tiết sản phẩm:", error);
            res.status(500).render("500", { message: "Lỗi server khi tải chi tiết sản phẩm" });
        }
    }



    // [POST] /products/:id/reviews
    async addReview(req, res) {
        try {
            const productId = parseInt(req.params.id);
            const userId = req.session.user?.id;
            const { rating, comment } = req.body;

            if (!userId) return res.redirect("/accounts/login");

            const existing = await ProductReview.getUserReview(productId, userId);

            if (existing) {
                // Cập nhật nếu đã có
                await ProductReview.updateReview(productId, userId, rating, comment);
            } else {
                // Thêm mới
                await ProductReview.addReview(productId, userId, rating, comment);
            }

            res.redirect(`/products/${productId}`);
        } catch (error) {
            console.error("❌ Lỗi khi thêm/cập nhật đánh giá:", error);
            res.status(500).render("500", { message: "Lỗi server khi thêm/cập nhật đánh giá" });
        }
    }

    // [POST] /products/reviews/:id/delete
    async deleteReview(req, res) {
        try {
            // Kiểm tra đăng nhập
            if (!req.session.user) {
                return res.redirect('/accounts/login');
            }

            const reviewId = parseInt(req.params.id);
            const userId = req.session.user.id;
            const role = req.session.user.role; // 'admin' hoặc 'user'

            const deleted = await ProductReview.deleteReview(reviewId, userId, role);

            if (deleted) {
                res.redirect(req.get('referer') || '/products');
            } else {
                res.status(403).render('403', { message: 'Bạn không có quyền xóa đánh giá này' });
            }
        } catch (err) {
            console.error('❌ Lỗi xóa đánh giá:', err);
            res.status(500).render('500', { message: 'Lỗi server khi xóa đánh giá' });
        }
    }

    // GET /products/search?q=...&page=...
    async search(req, res) {
        try {
            const keyword = req.query.q || '';
            const page = parseInt(req.query.page) || 1;
            const limit = 8; // số sản phẩm mỗi trang

            const { products, total } = await Product.searchProducts(keyword, page, limit);

            res.render('products', {
                products,
                q: keyword,
                totalPages: Math.ceil(total / limit),
                currentPage: page
            }); 
        } catch (err) {
            console.error(err);
            res.status(500).render('500', { message: 'Lỗi server khi tìm kiếm sản phẩm' });
        }
    }
}

// export 1 instance để routes có thể dùng trực tiếp
module.exports = new ProductController();


