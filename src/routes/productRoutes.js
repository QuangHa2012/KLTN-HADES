const express = require('express');
const router = express.Router();

const productController = require('../app/controllers/ProductController');





router.get('/outerwears', productController.getOuterwearsProducts);
router.get('/bottom', productController.getBottomProducts);
router.get('/top', productController.getTopProducts);
router.get('/accessories', productController.getAccessoriesProducts);
router.get('/bags', productController.getBagsProducts);
//router.get('/search', productController.search);
router.get('/:id', productController.detail);
router.post('/:id/reviews', productController.addReview);
router.post('/reviews/:id/delete', productController.deleteReview);
router.get('/', productController.listProducts);

module.exports = router;