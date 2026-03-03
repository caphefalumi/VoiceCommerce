import { expect, describe, it } from "bun:test";
import Product from "../../src/models/Product";

describe("Product Model", () => {
  it("should be able to instantiate a product", () => {
    const productData = {
      url: "https://www.thegioididong.com/dong-ho-thong-minh/kidcare-sight-s1",
      name: "Đồng hồ định vị trẻ em Kidcare Sight S1",
      price: 1990000,
      originalPrice: 2250000,
      images: [
        "https://cdn.tgdd.vn/Products/Images/7077/333790/Slider/vi-vn-kidcare-sight-s1-thumbvideo-1.jpg"
      ],
      specs: [
        { label: "Công nghệ màn hình:", value: "AMOLED" },
        { label: "Chất liệu mặt:" }
      ]
    };

    const product = new Product(productData);
    expect(product.url).toBe(productData.url);
    expect(product.name).toBe(productData.name);
    expect(product.price).toBe(productData.price);
    expect(product.images[0]).toBe(productData.images[0]);
    expect(product.specs[0].label).toBe("Công nghệ màn hình:");
    expect(product.specs[0].value).toBe("AMOLED");
    expect(product.specs[1].label).toBe("Chất liệu mặt:");
  });
});
