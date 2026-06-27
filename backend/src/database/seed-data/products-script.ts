// @ts-nocheck
import { Product } from "../../modules/product/models/product.model";
import { Category } from "../../modules/product/models/category.model";
import { CPU } from "../../modules/product/components/models/cpu.model";
import { GPU } from "../../modules/product/components/models/gpu.model";
import { RAM } from "../../modules/product/components/models/ram.model";
import { Drive } from "../../modules/product/components/models/drive.model";
import { Motherboard } from "../../modules/product/components/models/motherboard.model";
import { PSU } from "../../modules/product/components/models/psu.model";
import { Case } from "../../modules/product/components/models/case.model";
import { Monitor } from "../../modules/product/components/models/monitor.model";
import { Mouse } from "../../modules/product/components/models/mouse.model";
import { Keyboard } from "../../modules/product/components/models/keyboard.model";
import { Headset } from "../../modules/product/components/models/headset.model";
import { NetworkCard } from "../../modules/product/components/models/networkCard.model";
import { Laptop } from "../../modules/product/components/laptop/models/laptop.model";
import { PC } from "../../modules/product/components/models/pc.model";
import { Cooler } from "../../modules/product/components/models/cooler.model";
import {
  saveProductIfNotExists,
  saveComponentIfNotExists,
} from "./seed-product.helpers";

export async function addProducts() {
    const caseCategory = await Category.findOne({
      slug: "case",
    });
    if (!caseCategory) {
      throw new Error("Case category not found");
    }
    const cpuCategory = await Category.findOne({
      slug: "cpu",
    });
    if (!cpuCategory) {
      throw new Error("CPU category not found");
    }
    const gpuCategory = await Category.findOne({
      slug: "gpu",
    });
    if (!gpuCategory) {
      throw new Error("GPU category not found");
    }
    const motherboardCategory = await Category.findOne({
      slug: "motherboard",
    });
    if (!motherboardCategory) {
      throw new Error("Motherboard category not found");
    }
    const psuCategory = await Category.findOne({
      slug: "psu",
    });
    if (!psuCategory) {
      throw new Error("PSU category not found");
    }
    const ramCategory = await Category.findOne({
      slug: "ram",
    });
    if (!ramCategory) {
      throw new Error("RAM category not found");
    }
    const driveCategory = await Category.findOne({
      slug: "drive",
    });
    if (!driveCategory) {
      throw new Error("Drive category not found");
    }
    const monitorCategory = await Category.findOne({
      slug: "monitor",
    });
    if (!monitorCategory) {
      throw new Error("Monitor category not found");
    }
    const mouseCategory = await Category.findOne({
      slug: "mouse",
    });
    if (!mouseCategory) {
      throw new Error("Mouse category not found");
    }
    const networkCardCategory = await Category.findOne({
      slug: "network-card",
    });
    if (!networkCardCategory) {
      throw new Error("Network card category not found");
    }
    const headsetCategory = await Category.findOne({
      slug: "headset",
    });
    if (!headsetCategory) {
      throw new Error("Headset category not found");
    }
    const keyboardCategory = await Category.findOne({
      slug: "keyboard",
    });
    if (!keyboardCategory) {
      throw new Error("Keyboard category not found");
    }

    // Create products using Active Records
    const savedProducts = [];

    // CPU Products
    const product1: Product = new Product();
    product1.name = "Intel Core i9-13900K";
    product1.price = 15990000;
    product1.description =
      "Intel Core i9-13900K 24-Core Processor with Intel UHD Graphics 770";
    product1.category = cpuCategory;
    const _saved_product1 = await saveProductIfNotExists(product1);
    if (_saved_product1) savedProducts.push(_saved_product1);

    const product2: Product = new Product();
    product2.name = "AMD Ryzen 9 7950X";
    product2.price = 18990000;
    product2.description =
      "AMD Ryzen 9 7950X 16-Core Processor with AMD Radeon Graphics";
    product2.category = cpuCategory;
    const _saved_product2 = await saveProductIfNotExists(product2);
    if (_saved_product2) savedProducts.push(_saved_product2);

    const product3: Product = new Product();
    product3.name = "Intel Core i7-13700K";
    product3.price = 11990000;
    product3.description =
      "Intel Core i7-13700K 16-Core Processor with Intel UHD Graphics 770";
    product3.category = cpuCategory;
    const _saved_product3 = await saveProductIfNotExists(product3);
    if (_saved_product3) savedProducts.push(_saved_product3);

    // GPU Products
    const product4: Product = new Product();
    product4.name = "NVIDIA GeForce RTX 4090";
    product4.price = 45990000;
    product4.description = "NVIDIA GeForce RTX 4090 24GB GDDR6X Graphics Card";
    product4.category = gpuCategory;
    const _saved_product4 = await saveProductIfNotExists(product4);
    if (_saved_product4) savedProducts.push(_saved_product4);

    const product5: Product = new Product();
    product5.name = "AMD Radeon RX 7900 XTX";
    product5.price = 29990000;
    product5.description = "AMD Radeon RX 7900 XTX 24GB GDDR6 Graphics Card";
    product5.category = gpuCategory;
    const _saved_product5 = await saveProductIfNotExists(product5);
    if (_saved_product5) savedProducts.push(_saved_product5);

    const product6: Product = new Product();
    product6.name = "NVIDIA GeForce RTX 4080";
    product6.price = 32990000;
    product6.description = "NVIDIA GeForce RTX 4080 16GB GDDR6X Graphics Card";
    product6.category = gpuCategory;
    const _saved_product6 = await saveProductIfNotExists(product6);
    if (_saved_product6) savedProducts.push(_saved_product6);

    // RAM Products
    const product7: Product = new Product();
    product7.name = "Corsair Vengeance RGB Pro 32GB";
    product7.price = 2990000;
    product7.description =
      "Corsair Vengeance RGB Pro 32GB (2x16GB) DDR4-3600MHz";
    product7.category = ramCategory;
    const _saved_product7 = await saveProductIfNotExists(product7);
    if (_saved_product7) savedProducts.push(_saved_product7);

    const product8: Product = new Product();
    product8.name = "G.Skill Trident Z5 RGB 32GB";
    product8.price = 3990000;
    product8.description = "G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5-6000MHz";
    product8.category = ramCategory;
    const _saved_product8 = await saveProductIfNotExists(product8);
    if (_saved_product8) savedProducts.push(_saved_product8);

    const product9: Product = new Product();
    product9.name = "Kingston Fury Beast 16GB";
    product9.price = 1590000;
    product9.description = "Kingston Fury Beast 16GB (2x8GB) DDR4-3200MHz";
    product9.category = ramCategory;
    const _saved_product9 = await saveProductIfNotExists(product9);
    if (_saved_product9) savedProducts.push(_saved_product9);

    // Drive Products
    const product10: Product = new Product();
    product10.name = "Samsung 970 EVO Plus 1TB";
    product10.price = 2990000;
    product10.description = "Samsung 970 EVO Plus 1TB NVMe M.2 SSD";
    product10.category = driveCategory;
    const _saved_product10 = await saveProductIfNotExists(product10);
    if (_saved_product10) savedProducts.push(_saved_product10);

    const product11: Product = new Product();
    product11.name = "WD Black SN850X 2TB";
    product11.price = 5990000;
    product11.description = "WD Black SN850X 2TB NVMe M.2 SSD";
    product11.category = driveCategory;
    const _saved_product11 = await saveProductIfNotExists(product11);
    if (_saved_product11) savedProducts.push(_saved_product11);

    const product12: Product = new Product();
    product12.name = "Seagate Barracuda 2TB";
    product12.price = 1590000;
    product12.description = "Seagate Barracuda 2TB 7200RPM SATA HDD";
    product12.category = driveCategory;
    const _saved_product12 = await saveProductIfNotExists(product12);
    if (_saved_product12) savedProducts.push(_saved_product12);

    // Motherboard Products
    const product13: Product = new Product();
    product13.name = "ASUS ROG Maximus Z790 Hero";
    product13.price = 8990000;
    product13.description =
      "ASUS ROG Maximus Z790 Hero Intel Z790 ATX Motherboard";
    product13.category = motherboardCategory;
    const _saved_product13 = await saveProductIfNotExists(product13);
    if (_saved_product13) savedProducts.push(_saved_product13);

    const product14: Product = new Product();
    product14.name = "MSI MPG B650 Carbon WiFi";
    product14.price = 5990000;
    product14.description = "MSI MPG B650 Carbon WiFi AMD B650 ATX Motherboard";
    product14.category = motherboardCategory;
    const _saved_product14 = await saveProductIfNotExists(product14);
    if (_saved_product14) savedProducts.push(_saved_product14);

    const product15: Product = new Product();
    product15.name = "Gigabyte B760 Aorus Elite";
    product15.price = 4990000;
    product15.description =
      "Gigabyte B760 Aorus Elite Intel B760 ATX Motherboard";
    product15.category = motherboardCategory;
    const _saved_product15 = await saveProductIfNotExists(product15);
    if (_saved_product15) savedProducts.push(_saved_product15);

    // PSU Products
    const product16: Product = new Product();
    product16.name = "Corsair RM850x";
    product16.price = 3990000;
    product16.description = "Corsair RM850x 850W 80+ Gold Fully Modular PSU";
    product16.category = psuCategory;
    const _saved_product16 = await saveProductIfNotExists(product16);
    if (_saved_product16) savedProducts.push(_saved_product16);

    const product17: Product = new Product();
    product17.name = "Seasonic Focus GX-750";
    product17.price = 2990000;
    product17.description =
      "Seasonic Focus GX-750 750W 80+ Gold Fully Modular PSU";
    product17.category = psuCategory;
    const _saved_product17 = await saveProductIfNotExists(product17);
    if (_saved_product17) savedProducts.push(_saved_product17);

    const product18: Product = new Product();
    product18.name = "EVGA SuperNOVA 1000W";
    product18.price = 5990000;
    product18.description =
      "EVGA SuperNOVA 1000W 80+ Platinum Fully Modular PSU";
    product18.category = psuCategory;
    const _saved_product18 = await saveProductIfNotExists(product18);
    if (_saved_product18) savedProducts.push(_saved_product18);

    // Case Products
    const product19: Product = new Product();
    product19.name = "NZXT H510 Elite";
    product19.price = 3990000;
    product19.description =
      "NZXT H510 Elite Mid-Tower ATX Case with Tempered Glass";
    product19.category = caseCategory;
    const _saved_product19 = await saveProductIfNotExists(product19);
    if (_saved_product19) savedProducts.push(_saved_product19);

    const product20: Product = new Product();
    product20.name = "Lian Li O11 Dynamic";
    product20.price = 5990000;
    product20.description = "Lian Li O11 Dynamic Mid-Tower ATX Case";
    product20.category = caseCategory;
    const _saved_product20 = await saveProductIfNotExists(product20);
    if (_saved_product20) savedProducts.push(_saved_product20);

    const product21: Product = new Product();
    product21.name = "Phanteks Enthoo 719";
    product21.price = 8990000;
    product21.description = "Phanteks Enthoo 719 Full-Tower ATX Case";
    product21.category = caseCategory;
    const _saved_product21 = await saveProductIfNotExists(product21);
    if (_saved_product21) savedProducts.push(_saved_product21);

    // Monitor Products
    const product22: Product = new Product();
    product22.name = "Samsung Odyssey G9";
    product22.price = 19990000;
    product22.description =
      "Samsung Odyssey G9 49-inch Ultrawide Gaming Monitor";
    product22.category = monitorCategory;
    const _saved_product22 = await saveProductIfNotExists(product22);
    if (_saved_product22) savedProducts.push(_saved_product22);

    const product23: Product = new Product();
    product23.name = "LG 27GP850-B";
    product23.price = 8990000;
    product23.description = "LG 27GP850-B 27-inch 1440p 165Hz Gaming Monitor";
    product23.category = monitorCategory;
    const _saved_product23 = await saveProductIfNotExists(product23);
    if (_saved_product23) savedProducts.push(_saved_product23);

    const product24: Product = new Product();
    product24.name = "ASUS ROG Swift PG279Q";
    product24.price = 12990000;
    product24.description =
      "ASUS ROG Swift PG279Q 27-inch 1440p 165Hz Gaming Monitor";
    product24.category = monitorCategory;
    const _saved_product24 = await saveProductIfNotExists(product24);
    if (_saved_product24) savedProducts.push(_saved_product24);

    // Mouse Products
    const product25: Product = new Product();
    product25.name = "Logitech G Pro X Superlight";
    product25.price = 2990000;
    product25.description = "Logitech G Pro X Superlight Wireless Gaming Mouse";
    product25.category = mouseCategory;
    const _saved_product25 = await saveProductIfNotExists(product25);
    if (_saved_product25) savedProducts.push(_saved_product25);

    const product26: Product = new Product();
    product26.name = "Razer DeathAdder V3 Pro";
    product26.price = 3990000;
    product26.description = "Razer DeathAdder V3 Pro Wireless Gaming Mouse";
    product26.category = mouseCategory;
    const _saved_product26 = await saveProductIfNotExists(product26);
    if (_saved_product26) savedProducts.push(_saved_product26);

    const product27: Product = new Product();
    product27.name = "SteelSeries Rival 600";
    product27.price = 1990000;
    product27.description = "SteelSeries Rival 600 Gaming Mouse";
    product27.category = mouseCategory;
    const _saved_product27 = await saveProductIfNotExists(product27);
    if (_saved_product27) savedProducts.push(_saved_product27);

    // Keyboard Products
    const product28: Product = new Product();
    product28.name = "Corsair K100 RGB";
    product28.price = 5990000;
    product28.description = "Corsair K100 RGB Mechanical Gaming Keyboard";
    product28.category = keyboardCategory;
    const _saved_product28 = await saveProductIfNotExists(product28);
    if (_saved_product28) savedProducts.push(_saved_product28);

    const product29: Product = new Product();
    product29.name = "Razer BlackWidow V3 Pro";
    product29.price = 4990000;
    product29.description =
      "Razer BlackWidow V3 Pro Wireless Mechanical Keyboard";
    product29.category = keyboardCategory;
    const _saved_product29 = await saveProductIfNotExists(product29);
    if (_saved_product29) savedProducts.push(_saved_product29);

    const product30: Product = new Product();
    product30.name = "SteelSeries Apex Pro";
    product30.price = 6990000;
    product30.description =
      "SteelSeries Apex Pro TKL Wireless Mechanical Keyboard";
    product30.category = keyboardCategory;
    const _saved_product30 = await saveProductIfNotExists(product30);
    if (_saved_product30) savedProducts.push(_saved_product30);

    // Headset Products
    const product31: Product = new Product();
    product31.name = "SteelSeries Arctis Pro Wireless";
    product31.price = 5990000;
    product31.description = "SteelSeries Arctis Pro Wireless Gaming Headset";
    product31.category = headsetCategory;
    const _saved_product31 = await saveProductIfNotExists(product31);
    if (_saved_product31) savedProducts.push(_saved_product31);

    const product32: Product = new Product();
    product32.name = "HyperX Cloud Alpha";
    product32.price = 2990000;
    product32.description = "HyperX Cloud Alpha Gaming Headset";
    product32.category = headsetCategory;
    const _saved_product32 = await saveProductIfNotExists(product32);
    if (_saved_product32) savedProducts.push(_saved_product32);

    const product33: Product = new Product();
    product33.name = "Logitech G Pro X";
    product33.price = 3990000;
    product33.description = "Logitech G Pro X Wireless Gaming Headset";
    product33.category = headsetCategory;
    const _saved_product33 = await saveProductIfNotExists(product33);
    if (_saved_product33) savedProducts.push(_saved_product33);

    // Network Card Products
    const product34: Product = new Product();
    product34.name = "Intel AX200 WiFi 6";
    product34.price = 899000;
    product34.description = "Intel AX200 WiFi 6 Wireless Network Adapter";
    product34.category = networkCardCategory;
    const _saved_product34 = await saveProductIfNotExists(product34);
    if (_saved_product34) savedProducts.push(_saved_product34);

    const product35: Product = new Product();
    product35.name = "ASUS PCE-AC88";
    product35.price = 1990000;
    product35.description = "ASUS PCE-AC88 AC3100 Wireless Network Adapter";
    product35.category = networkCardCategory;
    const _saved_product35 = await saveProductIfNotExists(product35);
    if (_saved_product35) savedProducts.push(_saved_product35);

    const product36: Product = new Product();
    product36.name = "TP-Link Archer T9E";
    product36.price = 1590000;
    product36.description =
      "TP-Link Archer T9E AC1900 Wireless Network Adapter";
    product36.category = networkCardCategory;
    const _saved_product36 = await saveProductIfNotExists(product36);
    if (_saved_product36) savedProducts.push(_saved_product36);

    // Additional CPU Products
    const product37: Product = new Product();
    product37.name = "AMD Ryzen 5 7600X";
    product37.price = 7990000;
    product37.description =
      "AMD Ryzen 5 7600X 6-Core Processor with AMD Radeon Graphics";
    product37.category = cpuCategory;
    const _saved_product37 = await saveProductIfNotExists(product37);
    if (_saved_product37) savedProducts.push(_saved_product37);

    const product38: Product = new Product();
    product38.name = "Intel Core i5-13600K";
    product38.price = 8990000;
    product38.description =
      "Intel Core i5-13600K 14-Core Processor with Intel UHD Graphics 770";
    product38.category = cpuCategory;
    const _saved_product38 = await saveProductIfNotExists(product38);
    if (_saved_product38) savedProducts.push(_saved_product38);

    const product39: Product = new Product();
    product39.name = "AMD Ryzen 7 5800X3D";
    product39.price = 12990000;
    product39.description =
      "AMD Ryzen 7 5800X3D 8-Core Processor with 3D V-Cache";
    product39.category = cpuCategory;
    const _saved_product39 = await saveProductIfNotExists(product39);
    if (_saved_product39) savedProducts.push(_saved_product39);

    // Additional GPU Products
    const product40: Product = new Product();
    product40.name = "NVIDIA GeForce RTX 4070 Ti";
    product40.price = 22990000;
    product40.description =
      "NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X Graphics Card";
    product40.category = gpuCategory;
    const _saved_product40 = await saveProductIfNotExists(product40);
    if (_saved_product40) savedProducts.push(_saved_product40);

    const product41: Product = new Product();
    product41.name = "AMD Radeon RX 7700 XT";
    product41.price = 15990000;
    product41.description = "AMD Radeon RX 7700 XT 12GB GDDR6 Graphics Card";
    product41.category = gpuCategory;
    const _saved_product41 = await saveProductIfNotExists(product41);
    if (_saved_product41) savedProducts.push(_saved_product41);

    const product42: Product = new Product();
    product42.name = "NVIDIA GeForce RTX 4060 Ti";
    product42.price = 15990000;
    product42.description =
      "NVIDIA GeForce RTX 4060 Ti 8GB GDDR6 Graphics Card";
    product42.category = gpuCategory;
    const _saved_product42 = await saveProductIfNotExists(product42);
    if (_saved_product42) savedProducts.push(_saved_product42);

    // Additional RAM Products
    const product43: Product = new Product();
    product43.name = "Crucial Ballistix MAX 64GB";
    product43.price = 5990000;
    product43.description = "Crucial Ballistix MAX 64GB (2x32GB) DDR4-4000MHz";
    product43.category = ramCategory;
    const _saved_product43 = await saveProductIfNotExists(product43);
    if (_saved_product43) savedProducts.push(_saved_product43);

    const product44: Product = new Product();
    product44.name = "TeamGroup T-Force Delta RGB 32GB";
    product44.price = 3490000;
    product44.description =
      "TeamGroup T-Force Delta RGB 32GB (2x16GB) DDR4-3600MHz";
    product44.category = ramCategory;
    const _saved_product44 = await saveProductIfNotExists(product44);
    if (_saved_product44) savedProducts.push(_saved_product44);

    const product45: Product = new Product();
    product45.name = "Patriot Viper Steel 16GB";
    product45.price = 1290000;
    product45.description = "Patriot Viper Steel 16GB (2x8GB) DDR4-3200MHz";
    product45.category = ramCategory;
    const _saved_product45 = await saveProductIfNotExists(product45);
    if (_saved_product45) savedProducts.push(_saved_product45);

    // Additional Drive Products
    const product46: Product = new Product();
    product46.name = "Crucial P5 Plus 1TB";
    product46.price = 3490000;
    product46.description = "Crucial P5 Plus 1TB NVMe M.2 SSD";
    product46.category = driveCategory;
    const _saved_product46 = await saveProductIfNotExists(product46);
    if (_saved_product46) savedProducts.push(_saved_product46);

    const product47: Product = new Product();
    product47.name = "Sabrent Rocket 4 Plus 2TB";
    product47.price = 6990000;
    product47.description = "Sabrent Rocket 4 Plus 2TB NVMe M.2 SSD";
    product47.category = driveCategory;
    const _saved_product47 = await saveProductIfNotExists(product47);
    if (_saved_product47) savedProducts.push(_saved_product47);

    const product48: Product = new Product();
    product48.name = "Western Digital Blue 4TB";
    product48.price = 2990000;
    product48.description = "Western Digital Blue 4TB 5400RPM SATA HDD";
    product48.category = driveCategory;
    const _saved_product48 = await saveProductIfNotExists(product48);
    if (_saved_product48) savedProducts.push(_saved_product48);

    // Additional Motherboard Products
    const product49: Product = new Product();
    product49.name = "ASRock B650E PG Riptide WiFi";
    product49.price = 3990000;
    product49.description =
      "ASRock B650E PG Riptide WiFi AMD B650E ATX Motherboard";
    product49.category = motherboardCategory;
    const _saved_product49 = await saveProductIfNotExists(product49);
    if (_saved_product49) savedProducts.push(_saved_product49);

    const product50: Product = new Product();
    product50.name = "MSI PRO Z690-A WiFi";
    product50.price = 5990000;
    product50.description = "MSI PRO Z690-A WiFi Intel Z690 ATX Motherboard";
    product50.category = motherboardCategory;
    const _saved_product50 = await saveProductIfNotExists(product50);
    if (_saved_product50) savedProducts.push(_saved_product50);

    const product51: Product = new Product();
    product51.name = "ASUS TUF Gaming B760M-Plus WiFi";
    product51.price = 4490000;
    product51.description =
      "ASUS TUF Gaming B760M-Plus WiFi Intel B760 mATX Motherboard";
    product51.category = motherboardCategory;
    const _saved_product51 = await saveProductIfNotExists(product51);
    if (_saved_product51) savedProducts.push(_saved_product51);

    // Additional PSU Products
    const product52: Product = new Product();
    product52.name = "be quiet! Straight Power 11 850W";
    product52.price = 4990000;
    product52.description =
      "be quiet! Straight Power 11 850W 80+ Gold Fully Modular PSU";
    product52.category = psuCategory;
    const _saved_product52 = await saveProductIfNotExists(product52);
    if (_saved_product52) savedProducts.push(_saved_product52);

    const product53: Product = new Product();
    product53.name = "Cooler Master V850 Gold V2";
    product53.price = 3990000;
    product53.description =
      "Cooler Master V850 Gold V2 850W 80+ Gold Fully Modular PSU";
    product53.category = psuCategory;
    const _saved_product53 = await saveProductIfNotExists(product53);
    if (_saved_product53) savedProducts.push(_saved_product53);

    const product54: Product = new Product();
    product54.name = "Thermaltake Toughpower GF1 750W";
    product54.price = 2990000;
    product54.description =
      "Thermaltake Toughpower GF1 750W 80+ Gold Fully Modular PSU";
    product54.category = psuCategory;
    const _saved_product54 = await saveProductIfNotExists(product54);
    if (_saved_product54) savedProducts.push(_saved_product54);

    // Additional Case Products
    const product55: Product = new Product();
    product55.name = "Fractal Design Meshify C";
    product55.price = 2990000;
    product55.description = "Fractal Design Meshify C Mid-Tower ATX Case";
    product55.category = caseCategory;
    const _saved_product55 = await saveProductIfNotExists(product55);
    if (_saved_product55) savedProducts.push(_saved_product55);

    const product56: Product = new Product();
    product56.name = "be quiet! Pure Base 500DX";
    product56.price = 3990000;
    product56.description = "be quiet! Pure Base 500DX Mid-Tower ATX Case";
    product56.category = caseCategory;
    const _saved_product56 = await saveProductIfNotExists(product56);
    if (_saved_product56) savedProducts.push(_saved_product56);

    const product57: Product = new Product();
    product57.name = "Corsair 4000D Airflow";
    product57.price = 3490000;
    product57.description = "Corsair 4000D Airflow Mid-Tower ATX Case";
    product57.category = caseCategory;
    const _saved_product57 = await saveProductIfNotExists(product57);
    if (_saved_product57) savedProducts.push(_saved_product57);

    // Additional Monitor Products
    const product58: Product = new Product();
    product58.name = "AOC CU34G2X";
    product58.price = 8990000;
    product58.description = "AOC CU34G2X 34-inch Ultrawide Gaming Monitor";
    product58.category = monitorCategory;
    const _saved_product58 = await saveProductIfNotExists(product58);
    if (_saved_product58) savedProducts.push(_saved_product58);

    const product59: Product = new Product();
    product59.name = "MSI Optix MAG274QRF";
    product59.price = 7990000;
    product59.description =
      "MSI Optix MAG274QRF 27-inch 1440p 165Hz Gaming Monitor";
    product59.category = monitorCategory;
    const _saved_product59 = await saveProductIfNotExists(product59);
    if (_saved_product59) savedProducts.push(_saved_product59);

    const product60: Product = new Product();
    product60.name = "ViewSonic XG270QG";
    product60.price = 9990000;
    product60.description =
      "ViewSonic XG270QG 27-inch 1440p 165Hz Gaming Monitor";
    product60.category = monitorCategory;
    const _saved_product60 = await saveProductIfNotExists(product60);
    if (_saved_product60) savedProducts.push(_saved_product60);

    // Additional Mouse Products
    const product61: Product = new Product();
    product61.name = "Glorious Model O Wireless";
    product61.price = 2490000;
    product61.description = "Glorious Model O Wireless Gaming Mouse";
    product61.category = mouseCategory;
    const _saved_product61 = await saveProductIfNotExists(product61);
    if (_saved_product61) savedProducts.push(_saved_product61);

    const product62: Product = new Product();
    product62.name = "Pulsar Xlite V2";
    product62.price = 1990000;
    product62.description = "Pulsar Xlite V2 Wireless Gaming Mouse";
    product62.category = mouseCategory;
    const _saved_product62 = await saveProductIfNotExists(product62);
    if (_saved_product62) savedProducts.push(_saved_product62);

    const product63: Product = new Product();
    product63.name = "Endgame Gear XM1r";
    product63.price = 1790000;
    product63.description = "Endgame Gear XM1r Gaming Mouse";
    product63.category = mouseCategory;
    const _saved_product63 = await saveProductIfNotExists(product63);
    if (_saved_product63) savedProducts.push(_saved_product63);

    // Additional Keyboard Products
    const product64: Product = new Product();
    product64.name = "Ducky One 3 RGB";
    product64.price = 3990000;
    product64.description = "Ducky One 3 RGB Mechanical Gaming Keyboard";
    product64.category = keyboardCategory;
    const _saved_product64 = await saveProductIfNotExists(product64);
    if (_saved_product64) savedProducts.push(_saved_product64);

    const product65: Product = new Product();
    product65.name = "Varmilo VA87M";
    product65.price = 3490000;
    product65.description = "Varmilo VA87M Mechanical Gaming Keyboard";
    product65.category = keyboardCategory;
    const _saved_product65 = await saveProductIfNotExists(product65);
    if (_saved_product65) savedProducts.push(_saved_product65);

    const product66: Product = new Product();
    product66.name = "Leopold FC900R";
    product66.price = 2990000;
    product66.description = "Leopold FC900R Mechanical Gaming Keyboard";
    product66.category = keyboardCategory;
    const _saved_product66 = await saveProductIfNotExists(product66);
    if (_saved_product66) savedProducts.push(_saved_product66);

    // Additional Headset Products
    const product67: Product = new Product();
    product67.name = "Beyerdynamic DT 990 Pro";
    product67.price = 3990000;
    product67.description = "Beyerdynamic DT 990 Pro Gaming Headset";
    product67.category = headsetCategory;
    const _saved_product67 = await saveProductIfNotExists(product67);
    if (_saved_product67) savedProducts.push(_saved_product67);

    const product68: Product = new Product();
    product68.name = "Audio-Technica ATH-M50x";
    product68.price = 3490000;
    product68.description = "Audio-Technica ATH-M50x Gaming Headset";
    product68.category = headsetCategory;
    const _saved_product68 = await saveProductIfNotExists(product68);
    if (_saved_product68) savedProducts.push(_saved_product68);

    const product69: Product = new Product();
    product69.name = "Sennheiser HD 560S";
    product69.price = 4490000;
    product69.description = "Sennheiser HD 560S Gaming Headset";
    product69.category = headsetCategory;
    const _saved_product69 = await saveProductIfNotExists(product69);
    if (_saved_product69) savedProducts.push(_saved_product69);

    // Additional Network Card Products
    const product70: Product = new Product();
    product70.name = "ASUS PCE-AX58BT";
    product70.price = 2490000;
    product70.description = "ASUS PCE-AX58BT WiFi 6 Wireless Network Adapter";
    product70.category = networkCardCategory;
    const _saved_product70 = await saveProductIfNotExists(product70);
    if (_saved_product70) savedProducts.push(_saved_product70);

    const product71: Product = new Product();
    product71.name = "Gigabyte GC-WBAX200";
    product71.price = 1990000;
    product71.description =
      "Gigabyte GC-WBAX200 WiFi 6 Wireless Network Adapter";
    product71.category = networkCardCategory;
    const _saved_product71 = await saveProductIfNotExists(product71);
    if (_saved_product71) savedProducts.push(_saved_product71);

    const product72: Product = new Product();
    product72.name = "MSI AX1800";
    product72.price = 1790000;
    product72.description = "MSI AX1800 WiFi 6 Wireless Network Adapter";
    product72.category = networkCardCategory;
    const _saved_product72 = await saveProductIfNotExists(product72);
    if (_saved_product72) savedProducts.push(_saved_product72);

    // 10 new DDR5 RAM products
    const product100: Product = new Product();
    product100.name = "Corsair Dominator Platinum RGB 32GB DDR5-6000";
    product100.price = 4990000;
    product100.description = "Corsair Dominator Platinum RGB 32GB (2x16GB) DDR5-6000MHz";
    product100.category = ramCategory;
    const _saved_product100 = await saveProductIfNotExists(product100);
    if (_saved_product100) savedProducts.push(_saved_product100);

    const product101: Product = new Product();
    product101.name = "G.Skill Ripjaws S5 32GB DDR5-5600";
    product101.price = 4290000;
    product101.description = "G.Skill Ripjaws S5 32GB (2x16GB) DDR5-5600MHz";
    product101.category = ramCategory;
    const _saved_product101 = await saveProductIfNotExists(product101);
    if (_saved_product101) savedProducts.push(_saved_product101);

    const product102: Product = new Product();
    product102.name = "Kingston Fury Beast 32GB DDR5-6000";
    product102.price = 4590000;
    product102.description = "Kingston Fury Beast 32GB (2x16GB) DDR5-6000MHz";
    product102.category = ramCategory;
    const _saved_product102 = await saveProductIfNotExists(product102);
    if (_saved_product102) savedProducts.push(_saved_product102);

    const product103: Product = new Product();
    product103.name = "TeamGroup T-Force Delta RGB 32GB DDR5-6400";
    product103.price = 5690000;
    product103.description = "TeamGroup T-Force Delta RGB 32GB (2x16GB) DDR5-6400MHz";
    product103.category = ramCategory;
    const _saved_product103 = await saveProductIfNotExists(product103);
    if (_saved_product103) savedProducts.push(_saved_product103);

    const product104: Product = new Product();
    product104.name = "Crucial Pro 32GB DDR5-5600";
    product104.price = 3990000;
    product104.description = "Crucial Pro 32GB (2x16GB) DDR5-5600MHz";
    product104.category = ramCategory;
    const _saved_product104 = await saveProductIfNotExists(product104);
    if (_saved_product104) savedProducts.push(_saved_product104);

    const product105: Product = new Product();
    product105.name = "Patriot Viper Venom 32GB DDR5-6200";
    product105.price = 4890000;
    product105.description = "Patriot Viper Venom 32GB (2x16GB) DDR5-6200MHz";
    product105.category = ramCategory;
    const _saved_product105 = await saveProductIfNotExists(product105);
    if (_saved_product105) savedProducts.push(_saved_product105);

    const product106: Product = new Product();
    product106.name = "ADATA XPG Lancer RGB 32GB DDR5-6000";
    product106.price = 4790000;
    product106.description = "ADATA XPG Lancer RGB 32GB (2x16GB) DDR5-6000MHz";
    product106.category = ramCategory;
    const _saved_product106 = await saveProductIfNotExists(product106);
    if (_saved_product106) savedProducts.push(_saved_product106);

    const product107: Product = new Product();
    product107.name = "PNY XLR8 Gaming 32GB DDR5-6000";
    product107.price = 4690000;
    product107.description = "PNY XLR8 Gaming 32GB (2x16GB) DDR5-6000MHz";
    product107.category = ramCategory;
    const _saved_product107 = await saveProductIfNotExists(product107);
    if (_saved_product107) savedProducts.push(_saved_product107);

    const product108: Product = new Product();
    product108.name = "Samsung 32GB DDR5-4800";
    product108.price = 3590000;
    product108.description = "Samsung 32GB (2x16GB) DDR5-4800MHz";
    product108.category = ramCategory;
    const _saved_product108 = await saveProductIfNotExists(product108);
    if (_saved_product108) savedProducts.push(_saved_product108);

    const product109: Product = new Product();
    product109.name = "Lexar ARES RGB 32GB DDR5-5600";
    product109.price = 4190000;
    product109.description = "Lexar ARES RGB 32GB (2x16GB) DDR5-5600MHz";
    product109.category = ramCategory;
    const _saved_product109 = await saveProductIfNotExists(product109);
    if (_saved_product109) savedProducts.push(_saved_product109);

    console.log(`Successfully added ${savedProducts.length} products`);
    return savedProducts;
  }

export async function addToComponents() {
    // Get existing products from database using Active Records
    const products = await Product.find({
      isActive: true,
      relations: ["category"],
    });

    const savedComponents = [];

    // CPU Components
    const cpuProducts = products.filter((p) => p.category?.slug === "cpu");
    for (const product of cpuProducts) {
      if (!product.name) continue;

      const cpu: CPU = new CPU();
      cpu.product = product;

      if (product.name.includes("Intel Core i9-13900K")) {
        cpu.cores = 24;
        cpu.threads = 32;
        cpu.baseClock = "3.0 GHz";
        cpu.boostClock = "5.8 GHz";
        cpu.socket = "LGA 1700";
        cpu.architecture = "Raptor Lake";
        cpu.tdp = 253;
        cpu.integratedGraphics = "Intel UHD Graphics 770";
      } else if (product.name.includes("AMD Ryzen 9 7950X")) {
        cpu.cores = 16;
        cpu.threads = 32;
        cpu.baseClock = "4.5 GHz";
        cpu.boostClock = "5.7 GHz";
        cpu.socket = "AM5";
        cpu.architecture = "Zen 4";
        cpu.tdp = 170;
        cpu.integratedGraphics = "AMD Radeon Graphics";
      } else if (product.name.includes("Intel Core i7-13700K")) {
        cpu.cores = 16;
        cpu.threads = 24;
        cpu.baseClock = "3.4 GHz";
        cpu.boostClock = "5.4 GHz";
        cpu.socket = "LGA 1700";
        cpu.architecture = "Raptor Lake";
        cpu.tdp = 253;
        cpu.integratedGraphics = "Intel UHD Graphics 770";
      } else if (product.name.includes("AMD Ryzen 7 7700X")) {
        cpu.cores = 8;
        cpu.threads = 16;
        cpu.baseClock = "4.5 GHz";
        cpu.boostClock = "5.4 GHz";
        cpu.socket = "AM5";
        cpu.architecture = "Zen 4";
        cpu.tdp = 105;
        cpu.integratedGraphics = "AMD Radeon Graphics";
      } else if (product.name.includes("AMD Ryzen 5 7600X")) {
        cpu.cores = 6;
        cpu.threads = 12;
        cpu.baseClock = "4.7 GHz";
        cpu.boostClock = "5.3 GHz";
        cpu.socket = "AM5";
        cpu.architecture = "Zen 4";
        cpu.tdp = 105;
        cpu.integratedGraphics = "AMD Radeon Graphics";
      } else if (product.name.includes("Intel Core i5-13600K")) {
        cpu.cores = 14;
        cpu.threads = 20;
        cpu.baseClock = "3.5 GHz";
        cpu.boostClock = "5.1 GHz";
        cpu.socket = "LGA 1700";
        cpu.architecture = "Raptor Lake";
        cpu.tdp = 181;
        cpu.integratedGraphics = "Intel UHD Graphics 770";
      } else if (product.name.includes("AMD Ryzen 7 5800X3D")) {
        cpu.cores = 8;
        cpu.threads = 16;
        cpu.baseClock = "3.4 GHz";
        cpu.boostClock = "4.5 GHz";
        cpu.socket = "AM4";
        cpu.architecture = "Zen 3";
        cpu.tdp = 105;
        cpu.integratedGraphics = "";
      }

      if (cpu.cores == null) {


        console.log(`Skip CPU component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_cpu = await CPU.findOne({ product: product.id });


      if (_exists_cpu) {


        console.log(`Skip CPU component (exists): ${product.name}`);


        continue;


      }


      await cpu.save();


      savedComponents.push(cpu);


      console.log(`Added CPU component for: ${product.name}`);
    }

    // GPU Components
    const gpuProducts = products.filter((p) => p.category?.slug === "gpu");
    for (const product of gpuProducts) {
      if (!product.name) continue;

      const gpu: GPU = new GPU();
      gpu.product = product;

      if (product.name.includes("NVIDIA GeForce RTX 4090")) {
        gpu.brand = "NVIDIA";
        gpu.model = "GeForce RTX 4090";
        gpu.vram = 24;
        gpu.chipset = "AD102";
        gpu.memoryType = "GDDR6X";
        gpu.lengthMm = 304;
      } else if (product.name.includes("AMD Radeon RX 7900 XTX")) {
        gpu.brand = "AMD";
        gpu.model = "Radeon RX 7900 XTX";
        gpu.vram = 24;
        gpu.chipset = "Navi 31";
        gpu.memoryType = "GDDR6";
        gpu.lengthMm = 287;
      } else if (product.name.includes("NVIDIA GeForce RTX 4080")) {
        gpu.brand = "NVIDIA";
        gpu.model = "GeForce RTX 4080";
        gpu.vram = 16;
        gpu.chipset = "AD103";
        gpu.memoryType = "GDDR6X";
        gpu.lengthMm = 304;
      } else if (product.name.includes("AMD Radeon RX 7800 XT")) {
        gpu.brand = "AMD";
        gpu.model = "Radeon RX 7800 XT";
        gpu.vram = 16;
        gpu.chipset = "Navi 32";
        gpu.memoryType = "GDDR6";
        gpu.lengthMm = 267;
      } else if (product.name.includes("NVIDIA GeForce RTX 4070 Ti")) {
        gpu.brand = "NVIDIA";
        gpu.model = "GeForce RTX 4070 Ti";
        gpu.vram = 12;
        gpu.chipset = "AD104";
        gpu.memoryType = "GDDR6X";
        gpu.lengthMm = 285;
      } else if (product.name.includes("AMD Radeon RX 7700 XT")) {
        gpu.brand = "AMD";
        gpu.model = "Radeon RX 7700 XT";
        gpu.vram = 12;
        gpu.chipset = "Navi 32";
        gpu.memoryType = "GDDR6";
        gpu.lengthMm = 267;
      } else if (product.name.includes("NVIDIA GeForce RTX 4060 Ti")) {
        gpu.brand = "NVIDIA";
        gpu.model = "GeForce RTX 4060 Ti";
        gpu.vram = 8;
        gpu.chipset = "AD106";
        gpu.memoryType = "GDDR6";
        gpu.lengthMm = 242;
      }

      if (gpu.vram == null) {


        console.log(`Skip GPU component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_gpu = await GPU.findOne({ product: product.id });


      if (_exists_gpu) {


        console.log(`Skip GPU component (exists): ${product.name}`);


        continue;


      }


      await gpu.save();


      savedComponents.push(gpu);


      console.log(`Added GPU component for: ${product.name}`);
    }

    // RAM Components
    const ramProducts = products.filter((p) => p.category?.slug === "ram");
    for (const product of ramProducts) {
      if (!product.name) continue;

      const ram: RAM = new RAM();
      ram.product = product;

      if (product.name.includes("Corsair Vengeance RGB Pro 32GB")) {
        ram.brand = "Corsair";
        ram.model = "Vengeance RGB Pro";
        ram.capacityGb = 32;
        ram.speedMhz = 3600;
        ram.type = "DDR4";
      } else if (product.name.includes("G.Skill Trident Z5 RGB 32GB")) {
        ram.brand = "G.Skill";
        ram.model = "Trident Z5 RGB";
        ram.capacityGb = 32;
        ram.speedMhz = 6000;
        ram.type = "DDR5";
      } else if (product.name.includes("Kingston Fury Beast 16GB")) {
        ram.brand = "Kingston";
        ram.model = "Fury Beast";
        ram.capacityGb = 16;
        ram.speedMhz = 3200;
        ram.type = "DDR4";
      } else if (product.name.includes("Crucial Ballistix MAX 64GB")) {
        ram.brand = "Crucial";
        ram.model = "Ballistix MAX";
        ram.capacityGb = 64;
        ram.speedMhz = 4000;
        ram.type = "DDR4";
      } else if (product.name.includes("TeamGroup T-Force Delta RGB 32GB")) {
        ram.brand = "TeamGroup";
        ram.model = "T-Force Delta RGB";
        ram.capacityGb = 32;
        ram.speedMhz = 3600;
        ram.type = "DDR4";
      } else if (product.name.includes("Patriot Viper Steel 16GB")) {
        ram.brand = "Patriot";
        ram.model = "Viper Steel";
        ram.capacityGb = 16;
        ram.speedMhz = 3200;
        ram.type = "DDR4";
      }

      if (ram.capacityGb == null) {


        console.log(`Skip RAM component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_ram = await RAM.findOne({ product: product.id });


      if (_exists_ram) {


        console.log(`Skip RAM component (exists): ${product.name}`);


        continue;


      }


      await ram.save();


      savedComponents.push(ram);


      console.log(`Added RAM component for: ${product.name}`);
    }

    // Drive Components
    const driveProducts = products.filter((p) => p.category?.slug === "drive");
    for (const product of driveProducts) {
      if (!product.name) continue;

      const drive: Drive = new Drive();
      drive.product = product;

      if (product.name.includes("Samsung 970 EVO Plus 1TB")) {
        drive.brand = "Samsung";
        drive.model = "970 EVO Plus";
        drive.type = "SSD";
        drive.capacityGb = 1000;
        drive.interface = "NVMe M.2";
      } else if (product.name.includes("WD Black SN850X 2TB")) {
        drive.brand = "Western Digital";
        drive.model = "Black SN850X";
        drive.type = "SSD";
        drive.capacityGb = 2000;
        drive.interface = "NVMe M.2";
      } else if (product.name.includes("Seagate Barracuda 2TB")) {
        drive.brand = "Seagate";
        drive.model = "Barracuda";
        drive.type = "HDD";
        drive.capacityGb = 2000;
        drive.interface = "SATA 6Gb/s";
      } else if (product.name.includes("Crucial P5 Plus 1TB")) {
        drive.brand = "Crucial";
        drive.model = "P5 Plus";
        drive.type = "SSD";
        drive.capacityGb = 1000;
        drive.interface = "NVMe M.2";
      } else if (product.name.includes("Sabrent Rocket 4 Plus 2TB")) {
        drive.brand = "Sabrent";
        drive.model = "Rocket 4 Plus";
        drive.type = "SSD";
        drive.capacityGb = 2000;
        drive.interface = "NVMe M.2";
      } else if (product.name.includes("Western Digital Blue 4TB")) {
        drive.brand = "Western Digital";
        drive.model = "Blue";
        drive.type = "HDD";
        drive.capacityGb = 4000;
        drive.interface = "SATA 6Gb/s";
      }

      if (drive.capacityGb == null) {


        console.log(`Skip Drive component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_drive = await Drive.findOne({ product: product.id });


      if (_exists_drive) {


        console.log(`Skip Drive component (exists): ${product.name}`);


        continue;


      }


      await drive.save();


      savedComponents.push(drive);


      console.log(`Added Drive component for: ${product.name}`);
    }

    // Motherboard Components
    const motherboardProducts = products.filter(
      (p) => p.category?.slug === "motherboard"
    );
    for (const product of motherboardProducts) {
      if (!product.name) continue;

      const motherboard: Motherboard = new Motherboard();
      motherboard.product = product;

      if (product.name.includes("ASUS ROG Maximus Z790 Hero")) {
        motherboard.brand = "ASUS";
        motherboard.model = "ROG Maximus Z790 Hero";
        motherboard.chipset = "Intel Z790";
        motherboard.socket = "LGA 1700";
        motherboard.formFactor = "ATX";
        motherboard.ramSlots = 4;
        motherboard.maxRam = 128;
      } else if (product.name.includes("MSI MPG B650 Carbon WiFi")) {
        motherboard.brand = "MSI";
        motherboard.model = "MPG B650 Carbon WiFi";
        motherboard.chipset = "AMD B650";
        motherboard.socket = "AM5";
        motherboard.formFactor = "ATX";
        motherboard.ramSlots = 4;
        motherboard.maxRam = 128;
      } else if (product.name.includes("Gigabyte B760 Aorus Elite")) {
        motherboard.brand = "Gigabyte";
        motherboard.model = "B760 Aorus Elite";
        motherboard.chipset = "Intel B760";
        motherboard.socket = "LGA 1700";
        motherboard.formFactor = "ATX";
        motherboard.ramSlots = 4;
        motherboard.maxRam = 128;
      } else if (product.name.includes("ASRock B650E PG Riptide WiFi")) {
        motherboard.brand = "ASRock";
        motherboard.model = "B650E PG Riptide WiFi";
        motherboard.chipset = "AMD B650E";
        motherboard.socket = "AM5";
        motherboard.formFactor = "ATX";
        motherboard.ramSlots = 4;
        motherboard.maxRam = 128;
      } else if (product.name.includes("MSI PRO Z690-A WiFi")) {
        motherboard.brand = "MSI";
        motherboard.model = "PRO Z690-A WiFi";
        motherboard.chipset = "Intel Z690";
        motherboard.socket = "LGA 1700";
        motherboard.formFactor = "ATX";
        motherboard.ramSlots = 4;
        motherboard.maxRam = 128;
      } else if (product.name.includes("ASUS TUF Gaming B760M-Plus WiFi")) {
        motherboard.brand = "ASUS";
        motherboard.model = "TUF Gaming B760M-Plus WiFi";
        motherboard.chipset = "Intel B760";
        motherboard.socket = "LGA 1700";
        motherboard.formFactor = "mATX";
        motherboard.ramSlots = 4;
        motherboard.maxRam = 128;
      }

      if (motherboard.socket == null) {


        console.log(`Skip Motherboard component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_motherboard = await Motherboard.findOne({ product: product.id });


      if (_exists_motherboard) {


        console.log(`Skip Motherboard component (exists): ${product.name}`);


        continue;


      }


      await motherboard.save();


      savedComponents.push(motherboard);


      console.log(`Added Motherboard component for: ${product.name}`);
    }

    // PSU Components
    const psuProducts = products.filter((p) => p.category?.slug === "psu");
    for (const product of psuProducts) {
      if (!product.name) continue;

      const psu: PSU = new PSU();
      psu.product = product;

      if (product.name.includes("Corsair RM850x")) {
        psu.brand = "Corsair";
        psu.model = "RM850x";
        psu.wattage = 850;
        psu.efficiencyRating = "80+ Gold";
        psu.modular = "Fully Modular";
      } else if (product.name.includes("Seasonic Focus GX-750")) {
        psu.brand = "Seasonic";
        psu.model = "Focus GX-750";
        psu.wattage = 750;
        psu.efficiencyRating = "80+ Gold";
        psu.modular = "Fully Modular";
      } else if (product.name.includes("EVGA SuperNOVA 1000W")) {
        psu.brand = "EVGA";
        psu.model = "SuperNOVA 1000W";
        psu.wattage = 1000;
        psu.efficiencyRating = "80+ Platinum";
        psu.modular = "Fully Modular";
      } else if (product.name.includes("be quiet! Straight Power 11 850W")) {
        psu.brand = "be quiet!";
        psu.model = "Straight Power 11 850W";
        psu.wattage = 850;
        psu.efficiencyRating = "80+ Gold";
        psu.modular = "Fully Modular";
      } else if (product.name.includes("Cooler Master V850 Gold V2")) {
        psu.brand = "Cooler Master";
        psu.model = "V850 Gold V2";
        psu.wattage = 850;
        psu.efficiencyRating = "80+ Gold";
        psu.modular = "Fully Modular";
      } else if (product.name.includes("Thermaltake Toughpower GF1 750W")) {
        psu.brand = "Thermaltake";
        psu.model = "Toughpower GF1 750W";
        psu.wattage = 750;
        psu.efficiencyRating = "80+ Gold";
        psu.modular = "Fully Modular";
      }

      if (psu.wattage == null) {


        console.log(`Skip PSU component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_psu = await PSU.findOne({ product: product.id });


      if (_exists_psu) {


        console.log(`Skip PSU component (exists): ${product.name}`);


        continue;


      }


      await psu.save();


      savedComponents.push(psu);


      console.log(`Added PSU component for: ${product.name}`);
    }

    // Case Components
    const caseProducts = products.filter((p) => p.category?.slug === "case");
    for (const product of caseProducts) {
      if (!product.name) continue;

      const caseComponent: Case = new Case();
      caseComponent.product = product;

      if (product.name.includes("NZXT H510 Elite")) {
        caseComponent.brand = "NZXT";
        caseComponent.model = "H510 Elite";
        caseComponent.formFactorSupport = "ATX, mATX, ITX";
        caseComponent.hasRgb = true;
        caseComponent.sidePanelType = "Tempered Glass";
      } else if (product.name.includes("Lian Li O11 Dynamic")) {
        caseComponent.brand = "Lian Li";
        caseComponent.model = "O11 Dynamic";
        caseComponent.formFactorSupport = "ATX, mATX, ITX";
        caseComponent.hasRgb = false;
        caseComponent.sidePanelType = "Tempered Glass";
      } else if (product.name.includes("Phanteks Enthoo 719")) {
        caseComponent.brand = "Phanteks";
        caseComponent.model = "Enthoo 719";
        caseComponent.formFactorSupport = "E-ATX, ATX, mATX, ITX";
        caseComponent.hasRgb = false;
        caseComponent.sidePanelType = "Tempered Glass";
      } else if (product.name.includes("Fractal Design Meshify C")) {
        caseComponent.brand = "Fractal Design";
        caseComponent.model = "Meshify C";
        caseComponent.formFactorSupport = "ATX, mATX, ITX";
        caseComponent.hasRgb = false;
        caseComponent.sidePanelType = "Tempered Glass";
      } else if (product.name.includes("be quiet! Pure Base 500DX")) {
        caseComponent.brand = "be quiet!";
        caseComponent.model = "Pure Base 500DX";
        caseComponent.formFactorSupport = "ATX, mATX, ITX";
        caseComponent.hasRgb = true;
        caseComponent.sidePanelType = "Tempered Glass";
      } else if (product.name.includes("Corsair 4000D Airflow")) {
        caseComponent.brand = "Corsair";
        caseComponent.model = "4000D Airflow";
        caseComponent.formFactorSupport = "ATX, mATX, ITX";
        caseComponent.hasRgb = false;
        caseComponent.sidePanelType = "Tempered Glass";
      }

      if (caseComponent.brand == null) {


        console.log(`Skip Case component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_caseComponent = await Case.findOne({ product: product.id });


      if (_exists_caseComponent) {


        console.log(`Skip Case component (exists): ${product.name}`);


        continue;


      }


      await caseComponent.save();


      savedComponents.push(caseComponent);


      console.log(`Added Case component for: ${product.name}`);
    }

    // Monitor Components
    const monitorProducts = products.filter(
      (p) => p.category?.slug === "monitor"
    );
    for (const product of monitorProducts) {
      if (!product.name) continue;

      const monitor: Monitor = new Monitor();
      monitor.product = product;

      if (product.name.includes("Samsung Odyssey G9")) {
        monitor.brand = "Samsung";
        monitor.model = "Odyssey G9";
        monitor.sizeInch = 49.0;
        monitor.resolution = "5120x1440";
        monitor.refreshRate = 240;
        monitor.panelType = "VA";
      } else if (product.name.includes("LG 27GP850-B")) {
        monitor.brand = "LG";
        monitor.model = "27GP850-B";
        monitor.sizeInch = 27.0;
        monitor.resolution = "2560x1440";
        monitor.refreshRate = 165;
        monitor.panelType = "IPS";
      } else if (product.name.includes("ASUS ROG Swift PG279Q")) {
        monitor.brand = "ASUS";
        monitor.model = "ROG Swift PG279Q";
        monitor.sizeInch = 27.0;
        monitor.resolution = "2560x1440";
        monitor.refreshRate = 165;
        monitor.panelType = "IPS";
      } else if (product.name.includes("AOC CU34G2X")) {
        monitor.brand = "AOC";
        monitor.model = "CU34G2X";
        monitor.sizeInch = 34.0;
        monitor.resolution = "3440x1440";
        monitor.refreshRate = 144;
        monitor.panelType = "VA";
      } else if (product.name.includes("MSI Optix MAG274QRF")) {
        monitor.brand = "MSI";
        monitor.model = "Optix MAG274QRF";
        monitor.sizeInch = 27.0;
        monitor.resolution = "2560x1440";
        monitor.refreshRate = 165;
        monitor.panelType = "IPS";
      } else if (product.name.includes("ViewSonic XG270QG")) {
        monitor.brand = "ViewSonic";
        monitor.model = "XG270QG";
        monitor.sizeInch = 27.0;
        monitor.resolution = "2560x1440";
        monitor.refreshRate = 165;
        monitor.panelType = "IPS";
      }

      if (monitor.sizeInch == null) {


        console.log(`Skip Monitor component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_monitor = await Monitor.findOne({ product: product.id });


      if (_exists_monitor) {


        console.log(`Skip Monitor component (exists): ${product.name}`);


        continue;


      }


      await monitor.save();


      savedComponents.push(monitor);


      console.log(`Added Monitor component for: ${product.name}`);
    }

    // Mouse Components
    const mouseProducts = products.filter((p) => p.category?.slug === "mouse");
    for (const product of mouseProducts) {
      if (!product.name) continue;

      const mouse: Mouse = new Mouse();
      mouse.product = product;

      if (product.name.includes("Logitech G Pro X Superlight")) {
        mouse.type = "Gaming";
        mouse.dpi = 25600;
        mouse.connectivity = "Wireless";
        mouse.hasRgb = false;
      } else if (product.name.includes("Razer DeathAdder V3 Pro")) {
        mouse.type = "Gaming";
        mouse.dpi = 30000;
        mouse.connectivity = "Wireless";
        mouse.hasRgb = true;
      } else if (product.name.includes("SteelSeries Rival 600")) {
        mouse.type = "Gaming";
        mouse.dpi = 12000;
        mouse.connectivity = "Wired";
        mouse.hasRgb = true;
      } else if (product.name.includes("Glorious Model O Wireless")) {
        mouse.type = "Gaming";
        mouse.dpi = 19000;
        mouse.connectivity = "Wireless";
        mouse.hasRgb = true;
      } else if (product.name.includes("Pulsar Xlite V2")) {
        mouse.type = "Gaming";
        mouse.dpi = 19000;
        mouse.connectivity = "Wireless";
        mouse.hasRgb = false;
      } else if (product.name.includes("Endgame Gear XM1r")) {
        mouse.type = "Gaming";
        mouse.dpi = 19000;
        mouse.connectivity = "Wired";
        mouse.hasRgb = false;
      }

      if (mouse.dpi == null) {


        console.log(`Skip Mouse component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_mouse = await Mouse.findOne({ product: product.id });


      if (_exists_mouse) {


        console.log(`Skip Mouse component (exists): ${product.name}`);


        continue;


      }


      await mouse.save();


      savedComponents.push(mouse);


      console.log(`Added Mouse component for: ${product.name}`);
    }

    // Keyboard Components
    const keyboardProducts = products.filter(
      (p) => p.category?.slug === "keyboard"
    );
    for (const product of keyboardProducts) {
      if (!product.name) continue;

      const keyboard: Keyboard = new Keyboard();
      keyboard.product = product;

      if (product.name.includes("Corsair K100 RGB")) {
        keyboard.type = "Mechanical";
        keyboard.switchType = "Optical-Mechanical";
        keyboard.connectivity = "Wired";
        keyboard.layout = "Full-size";
        keyboard.hasRgb = true;
      } else if (product.name.includes("Razer BlackWidow V3 Pro")) {
        keyboard.type = "Mechanical";
        keyboard.switchType = "Razer Yellow";
        keyboard.connectivity = "Wireless";
        keyboard.layout = "Full-size";
        keyboard.hasRgb = true;
      } else if (product.name.includes("SteelSeries Apex Pro")) {
        keyboard.type = "Mechanical";
        keyboard.switchType = "OmniPoint";
        keyboard.connectivity = "Wireless";
        keyboard.layout = "TKL";
        keyboard.hasRgb = true;
      } else if (product.name.includes("Ducky One 3 RGB")) {
        keyboard.type = "Mechanical";
        keyboard.switchType = "Cherry MX";
        keyboard.connectivity = "Wired";
        keyboard.layout = "Full-size";
        keyboard.hasRgb = true;
      } else if (product.name.includes("Varmilo VA87M")) {
        keyboard.type = "Mechanical";
        keyboard.switchType = "Cherry MX";
        keyboard.connectivity = "Wired";
        keyboard.layout = "TKL";
        keyboard.hasRgb = false;
      } else if (product.name.includes("Leopold FC900R")) {
        keyboard.type = "Mechanical";
        keyboard.switchType = "Cherry MX";
        keyboard.connectivity = "Wired";
        keyboard.layout = "Full-size";
        keyboard.hasRgb = false;
      }

      if (keyboard.switchType == null) {


        console.log(`Skip Keyboard component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_keyboard = await Keyboard.findOne({ product: product.id });


      if (_exists_keyboard) {


        console.log(`Skip Keyboard component (exists): ${product.name}`);


        continue;


      }


      await keyboard.save();


      savedComponents.push(keyboard);


      console.log(`Added Keyboard component for: ${product.name}`);
    }

    // Headset Components
    const headsetProducts = products.filter(
      (p) => p.category?.slug === "headset"
    );
    for (const product of headsetProducts) {
      if (!product.name) continue;

      const headset: Headset = new Headset();
      headset.product = product;

      if (product.name.includes("SteelSeries Arctis Pro Wireless")) {
        headset.hasMicrophone = true;
        headset.connectivity = "Wireless";
        headset.surroundSound = true;
      } else if (product.name.includes("HyperX Cloud Alpha")) {
        headset.hasMicrophone = true;
        headset.connectivity = "Wired";
        headset.surroundSound = false;
      } else if (product.name.includes("Logitech G Pro X")) {
        headset.hasMicrophone = true;
        headset.connectivity = "Wireless";
        headset.surroundSound = true;
      } else if (product.name.includes("Beyerdynamic DT 990 Pro")) {
        headset.hasMicrophone = false;
        headset.connectivity = "Wired";
        headset.surroundSound = false;
      } else if (product.name.includes("Audio-Technica ATH-M50x")) {
        headset.hasMicrophone = false;
        headset.connectivity = "Wired";
        headset.surroundSound = false;
      } else if (product.name.includes("Sennheiser HD 560S")) {
        headset.hasMicrophone = false;
        headset.connectivity = "Wired";
        headset.surroundSound = false;
      }

      if (headset.connectivity == null) {


        console.log(`Skip Headset component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_headset = await Headset.findOne({ product: product.id });


      if (_exists_headset) {


        console.log(`Skip Headset component (exists): ${product.name}`);


        continue;


      }


      await headset.save();


      savedComponents.push(headset);


      console.log(`Added Headset component for: ${product.name}`);
    }

    // Network Card Components
    const networkCardProducts = products.filter(
      (p) => p.category?.slug === "network-card"
    );
    for (const product of networkCardProducts) {
      if (!product.name) continue;

      const networkCard: NetworkCard = new NetworkCard();
      networkCard.product = product;

      if (product.name.includes("Intel AX200 WiFi 6")) {
        networkCard.type = "WiFi";
        networkCard.interface = "M.2";
        networkCard.speedMbps = 2400;
      } else if (product.name.includes("ASUS PCE-AC88")) {
        networkCard.type = "WiFi";
        networkCard.interface = "PCIe";
        networkCard.speedMbps = 2100;
      } else if (product.name.includes("TP-Link Archer T9E")) {
        networkCard.type = "WiFi";
        networkCard.interface = "PCIe";
        networkCard.speedMbps = 1900;
      } else if (product.name.includes("ASUS PCE-AX58BT")) {
        networkCard.type = "WiFi";
        networkCard.interface = "PCIe";
        networkCard.speedMbps = 2400;
      } else if (product.name.includes("Gigabyte GC-WBAX200")) {
        networkCard.type = "WiFi";
        networkCard.interface = "M.2";
        networkCard.speedMbps = 2400;
      } else if (product.name.includes("MSI AX1800")) {
        networkCard.type = "WiFi";
        networkCard.interface = "PCIe";
        networkCard.speedMbps = 1800;
      }

      if (networkCard.speedMbps == null) {


        console.log(`Skip NetworkCard component (no mapping): ${product.name}`);


        continue;


      }


      const _exists_networkCard = await NetworkCard.findOne({ product: product.id });


      if (_exists_networkCard) {


        console.log(`Skip NetworkCard component (exists): ${product.name}`);


        continue;


      }


      await networkCard.save();


      savedComponents.push(networkCard);


      console.log(`Added NetworkCard component for: ${product.name}`);
    }

    console.log(
      `Successfully added ${savedComponents.length} component records`
    );
    return savedComponents;
  }

export async function addLaptops() {
    const laptopCategory = await Category.findOne({
      slug: "laptop",
    });
    if (!laptopCategory) {
      throw new Error("Laptop category not found");
    }

    const savedLaptops = [];

    // Gaming Laptops
    const laptop1: Product = new Product();
    laptop1.name = "ASUS ROG Strix G15 G513";
    laptop1.price = 25990000;
    laptop1.description = "ASUS ROG Strix G15 Gaming Laptop with AMD Ryzen 7 and RTX 3070";
    laptop1.category = laptopCategory;
    const _saved_laptop1 = await saveProductIfNotExists(laptop1);
    if (_saved_laptop1) savedLaptops.push(_saved_laptop1);
    console.log(`Added laptop: ${laptop1.name}`);

    const laptop2: Product = new Product();
    laptop2.name = "MSI GE76 Raider";
    laptop2.price = 45990000;
    laptop2.description = "MSI GE76 Raider Gaming Laptop with Intel Core i9 and RTX 4080";
    laptop2.category = laptopCategory;
    const _saved_laptop2 = await saveProductIfNotExists(laptop2);
    if (_saved_laptop2) savedLaptops.push(_saved_laptop2);
    console.log(`Added laptop: ${laptop2.name}`);

    const laptop3: Product = new Product();
    laptop3.name = "Acer Predator Helios 300";
    laptop3.price = 29990000;
    laptop3.description = "Acer Predator Helios 300 Gaming Laptop with Intel Core i7 and RTX 3060";
    laptop3.category = laptopCategory;
    const _saved_laptop3 = await saveProductIfNotExists(laptop3);
    if (_saved_laptop3) savedLaptops.push(_saved_laptop3);
    console.log(`Added laptop: ${laptop3.name}`);

    const laptop4: Product = new Product();
    laptop4.name = "Alienware x17 R2";
    laptop4.price = 65990000;
    laptop4.description = "Alienware x17 R2 Gaming Laptop with Intel Core i9 and RTX 4090";
    laptop4.category = laptopCategory;
    const _saved_laptop4 = await saveProductIfNotExists(laptop4);
    if (_saved_laptop4) savedLaptops.push(_saved_laptop4);
    console.log(`Added laptop: ${laptop4.name}`);

    const laptop5: Product = new Product();
    laptop5.name = "Razer Blade 15";
    laptop5.price = 52990000;
    laptop5.description = "Razer Blade 15 Gaming Laptop with Intel Core i7 and RTX 4070";
    laptop5.category = laptopCategory;
    const _saved_laptop5 = await saveProductIfNotExists(laptop5);
    if (_saved_laptop5) savedLaptops.push(_saved_laptop5);
    console.log(`Added laptop: ${laptop5.name}`);

    // Business/Productivity Laptops
    const laptop6: Product = new Product();
    laptop6.name = "ThinkPad X1 Carbon Gen 11";
    laptop6.price = 35990000;
    laptop6.description = "Lenovo ThinkPad X1 Carbon Business Laptop with Intel Core i7";
    laptop6.category = laptopCategory;
    const _saved_laptop6 = await saveProductIfNotExists(laptop6);
    if (_saved_laptop6) savedLaptops.push(_saved_laptop6);
    console.log(`Added laptop: ${laptop6.name}`);

    const laptop7: Product = new Product();
    laptop7.name = "MacBook Pro 16-inch M3";
    laptop7.price = 59990000;
    laptop7.description = "Apple MacBook Pro 16-inch with M3 Pro chip";
    laptop7.category = laptopCategory;
    const _saved_laptop7 = await saveProductIfNotExists(laptop7);
    if (_saved_laptop7) savedLaptops.push(_saved_laptop7);
    console.log(`Added laptop: ${laptop7.name}`);

    const laptop8: Product = new Product();
    laptop8.name = "Dell XPS 13 Plus";
    laptop8.price = 32990000;
    laptop8.description = "Dell XPS 13 Plus Ultrabook with Intel Core i7";
    laptop8.category = laptopCategory;
    const _saved_laptop8 = await saveProductIfNotExists(laptop8);
    if (_saved_laptop8) savedLaptops.push(_saved_laptop8);
    console.log(`Added laptop: ${laptop8.name}`);

    const laptop9: Product = new Product();
    laptop9.name = "HP Spectre x360";
    laptop9.price = 28990000;
    laptop9.description = "HP Spectre x360 2-in-1 Laptop with Intel Core i7";
    laptop9.category = laptopCategory;
    const _saved_laptop9 = await saveProductIfNotExists(laptop9);
    if (_saved_laptop9) savedLaptops.push(_saved_laptop9);
    console.log(`Added laptop: ${laptop9.name}`);

    const laptop10: Product = new Product();
    laptop10.name = "ASUS ZenBook Pro 15";
    laptop10.price = 38990000;
    laptop10.description = "ASUS ZenBook Pro 15 Creative Laptop with Intel Core i9";
    laptop10.category = laptopCategory;
    const _saved_laptop10 = await saveProductIfNotExists(laptop10);
    if (_saved_laptop10) savedLaptops.push(_saved_laptop10);
    console.log(`Added laptop: ${laptop10.name}`);

    console.log(`Successfully added ${savedLaptops.length} laptop products`);
    return savedLaptops;
  }

export async function addPCs() {
    const pcCategory = await Category.findOne({
      slug: "pc",
    });
    if (!pcCategory) {
      throw new Error("PC category not found");
    }

    const savedPCs = [];

    // Gaming PCs
    const pc1: Product = new Product();
    pc1.name = "NZXT BLD Gaming PC - RTX 4090";
    pc1.price = 85990000;
    pc1.description = "High-end Gaming PC with Intel Core i9-13900K and RTX 4090";
    pc1.category = pcCategory;
    const _saved_pc1 = await saveProductIfNotExists(pc1);
    if (_saved_pc1) savedPCs.push(_saved_pc1);
    console.log(`Added PC: ${pc1.name}`);

    const pc2: Product = new Product();
    pc2.name = "Origin Chronos Gaming PC";
    pc2.price = 65990000;
    pc2.description = "Gaming PC with AMD Ryzen 9 7900X and RTX 4080";
    pc2.category = pcCategory;
    const _saved_pc2 = await saveProductIfNotExists(pc2);
    if (_saved_pc2) savedPCs.push(_saved_pc2);
    console.log(`Added PC: ${pc2.name}`);

    const pc3: Product = new Product();
    pc3.name = "Corsair ONE i300 Gaming PC";
    pc3.price = 75990000;
    pc3.description = "Compact Gaming PC with Intel Core i9 and RTX 4070 Ti";
    pc3.category = pcCategory;
    const _saved_pc3 = await saveProductIfNotExists(pc3);
    if (_saved_pc3) savedPCs.push(_saved_pc3);
    console.log(`Added PC: ${pc3.name}`);

    const pc4: Product = new Product();
    pc4.name = "Alienware Aurora R15";
    pc4.price = 55990000;
    pc4.description = "Alienware Aurora Gaming Desktop with Intel Core i7 and RTX 4070";
    pc4.category = pcCategory;
    const _saved_pc4 = await saveProductIfNotExists(pc4);
    if (_saved_pc4) savedPCs.push(_saved_pc4);
    console.log(`Added PC: ${pc4.name}`);

    const pc5: Product = new Product();
    pc5.name = "MSI Aegis RS 13";
    pc5.price = 45990000;
    pc5.description = "MSI Gaming Desktop with Intel Core i7 and RTX 4060 Ti";
    pc5.category = pcCategory;
    const _saved_pc5 = await saveProductIfNotExists(pc5);
    if (_saved_pc5) savedPCs.push(_saved_pc5);
    console.log(`Added PC: ${pc5.name}`);

    // Workstation PCs
    const pc6: Product = new Product();
    pc6.name = "HP Z6 G5 Workstation";
    pc6.price = 95990000;
    pc6.description = "Professional Workstation with Intel Xeon and RTX A6000";
    pc6.category = pcCategory;
    const _saved_pc6 = await saveProductIfNotExists(pc6);
    if (_saved_pc6) savedPCs.push(_saved_pc6);
    console.log(`Added PC: ${pc6.name}`);

    const pc7: Product = new Product();
    pc7.name = "Dell Precision 7000";
    pc7.price = 78990000;
    pc7.description = "Dell Precision Workstation with Intel Core i9 and RTX A5000";
    pc7.category = pcCategory;
    const _saved_pc7 = await saveProductIfNotExists(pc7);
    if (_saved_pc7) savedPCs.push(_saved_pc7);
    console.log(`Added PC: ${pc7.name}`);

    // Budget PCs
    const pc8: Product = new Product();
    pc8.name = "HP Pavilion Desktop";
    pc8.price = 18990000;
    pc8.description = "Budget Desktop PC with AMD Ryzen 5 and GTX 1660";
    pc8.category = pcCategory;
    const _saved_pc8 = await saveProductIfNotExists(pc8);
    if (_saved_pc8) savedPCs.push(_saved_pc8);
    console.log(`Added PC: ${pc8.name}`);

    const pc9: Product = new Product();
    pc9.name = "ASUS VivoPC Mini";
    pc9.price = 12990000;
    pc9.description = "Compact Mini PC with Intel Core i5 for Office Work";
    pc9.category = pcCategory;
    const _saved_pc9 = await saveProductIfNotExists(pc9);
    if (_saved_pc9) savedPCs.push(_saved_pc9);
    console.log(`Added PC: ${pc9.name}`);

    const pc10: Product = new Product();
    pc10.name = "Acer Aspire TC Desktop";
    pc10.price = 15990000;
    pc10.description = "Entry-level Desktop PC with AMD Ryzen 3 and integrated graphics";
    pc10.category = pcCategory;
    const _saved_pc10 = await saveProductIfNotExists(pc10);
    if (_saved_pc10) savedPCs.push(_saved_pc10);
    console.log(`Added PC: ${pc10.name}`);

    console.log(`Successfully added ${savedPCs.length} PC products`);
    return savedPCs;
  }

export async function addLaptopComponents() {
    const laptops = await Product.find({
      isActive: true,
      relations: ["category"],
    });

    const laptopProducts = laptops.filter((p) => p.category?.slug === "laptop");
    const savedLaptopComponents = [];

    for (const product of laptopProducts) {
      if (!product.name) continue;

      const laptop: Laptop = new Laptop();
      laptop.product = product;

      if (product.name.includes("ASUS ROG Strix G15 G513")) {
        laptop.brand = "ASUS";
        laptop.model = "ROG Strix G15 G513";
        laptop.screenSize = 15.6;
        laptop.screenType = "IPS";
        laptop.resolution = "1920x1080";
        laptop.batteryLifeHours = 6.0;
        laptop.weightKg = 2.3;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      } else if (product.name.includes("MSI GE76 Raider")) {
        laptop.brand = "MSI";
        laptop.model = "GE76 Raider";
        laptop.screenSize = 17.3;
        laptop.screenType = "IPS";
        laptop.resolution = "1920x1080";
        laptop.batteryLifeHours = 4.5;
        laptop.weightKg = 2.9;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      } else if (product.name.includes("Acer Predator Helios 300")) {
        laptop.brand = "Acer";
        laptop.model = "Predator Helios 300";
        laptop.screenSize = 15.6;
        laptop.screenType = "IPS";
        laptop.resolution = "1920x1080";
        laptop.batteryLifeHours = 5.0;
        laptop.weightKg = 2.5;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      } else if (product.name.includes("Alienware x17 R2")) {
        laptop.brand = "Alienware";
        laptop.model = "x17 R2";
        laptop.screenSize = 17.3;
        laptop.screenType = "IPS";
        laptop.resolution = "2560x1440";
        laptop.batteryLifeHours = 4.0;
        laptop.weightKg = 3.1;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      } else if (product.name.includes("Razer Blade 15")) {
        laptop.brand = "Razer";
        laptop.model = "Blade 15";
        laptop.screenSize = 15.6;
        laptop.screenType = "OLED";
        laptop.resolution = "2560x1440";
        laptop.batteryLifeHours = 5.5;
        laptop.weightKg = 2.0;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      } else if (product.name.includes("ThinkPad X1 Carbon Gen 11")) {
        laptop.brand = "Lenovo";
        laptop.model = "ThinkPad X1 Carbon Gen 11";
        laptop.screenSize = 14.0;
        laptop.screenType = "IPS";
        laptop.resolution = "1920x1200";
        laptop.batteryLifeHours = 12.0;
        laptop.weightKg = 1.1;
        laptop.os = "Windows 11 Pro";
        laptop.ramCount = 2;
      } else if (product.name.includes("MacBook Pro 16-inch M3")) {
        laptop.brand = "Apple";
        laptop.model = "MacBook Pro 16-inch M3";
        laptop.screenSize = 16.2;
        laptop.screenType = "Liquid Retina XDR";
        laptop.resolution = "3456x2234";
        laptop.batteryLifeHours = 18.0;
        laptop.weightKg = 2.1;
        laptop.os = "macOS Sonoma";
        laptop.ramCount = 1;
      } else if (product.name.includes("Dell XPS 13 Plus")) {
        laptop.brand = "Dell";
        laptop.model = "XPS 13 Plus";
        laptop.screenSize = 13.4;
        laptop.screenType = "OLED";
        laptop.resolution = "3456x2160";
        laptop.batteryLifeHours = 10.0;
        laptop.weightKg = 1.2;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      } else if (product.name.includes("HP Spectre x360")) {
        laptop.brand = "HP";
        laptop.model = "Spectre x360";
        laptop.screenSize = 13.5;
        laptop.screenType = "IPS Touch";
        laptop.resolution = "1920x1280";
        laptop.batteryLifeHours = 11.0;
        laptop.weightKg = 1.3;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      } else if (product.name.includes("ASUS ZenBook Pro 15")) {
        laptop.brand = "ASUS";
        laptop.model = "ZenBook Pro 15";
        laptop.screenSize = 15.6;
        laptop.screenType = "OLED";
        laptop.resolution = "2880x1620";
        laptop.batteryLifeHours = 8.0;
        laptop.weightKg = 1.8;
        laptop.os = "Windows 11";
        laptop.ramCount = 2;
      }

      if (laptop.brand == null) {


        console.log(`Skip Laptop component (no mapping): ${product.name}`);


        continue;


      }


      const _ex_laptop = await Laptop.findOne({ product: product.id });


      if (_ex_laptop) {


        console.log(`Skip Laptop component (exists): ${product.name}`);


        continue;


      }


      await laptop.save();


      savedLaptopComponents.push(laptop);


      console.log(`Added Laptop component for: ${product.name}`);
    }

    console.log(`Successfully added ${savedLaptopComponents.length} laptop component records`);
    return savedLaptopComponents;
  }

export async function addPCComponents() {
    const pcs = await Product.find({
      isActive: true,
      relations: ["category"],
    });

    const pcProducts = pcs.filter((p) => p.category?.slug === "pc");
    const savedPCComponents = [];

    for (const product of pcProducts) {
      if (!product.name) continue;

      const pc: PC = new PC();
      pc.product = product;

      if (product.name.includes("NZXT BLD Gaming PC - RTX 4090")) {
        pc.brand = "NZXT";
        pc.model = "BLD Gaming PC";
        pc.processor = "Intel Core i9-13900K";
        pc.ramGb = 32;
        pc.storageGb = 2000;
        pc.storageType = "NVMe SSD";
        pc.graphics = "NVIDIA GeForce RTX 4090";
        pc.formFactor = "Mid Tower";
        pc.powerSupplyWattage = 1000;
        pc.operatingSystem = "Windows 11 Pro";
      } else if (product.name.includes("Origin Chronos Gaming PC")) {
        pc.brand = "Origin";
        pc.model = "Chronos";
        pc.processor = "AMD Ryzen 9 7900X";
        pc.ramGb = 32;
        pc.storageGb = 1000;
        pc.storageType = "NVMe SSD";
        pc.graphics = "NVIDIA GeForce RTX 4080";
        pc.formFactor = "Mid Tower";
        pc.powerSupplyWattage = 850;
        pc.operatingSystem = "Windows 11 Pro";
      } else if (product.name.includes("Corsair ONE i300 Gaming PC")) {
        pc.brand = "Corsair";
        pc.model = "ONE i300";
        pc.processor = "Intel Core i9-12900K";
        pc.ramGb = 32;
        pc.storageGb = 1000;
        pc.storageType = "NVMe SSD";
        pc.graphics = "NVIDIA GeForce RTX 4070 Ti";
        pc.formFactor = "Compact";
        pc.powerSupplyWattage = 750;
        pc.operatingSystem = "Windows 11 Pro";
      } else if (product.name.includes("Alienware Aurora R15")) {
        pc.brand = "Alienware";
        pc.model = "Aurora R15";
        pc.processor = "Intel Core i7-13700F";
        pc.ramGb = 16;
        pc.storageGb = 1000;
        pc.storageType = "NVMe SSD";
        pc.graphics = "NVIDIA GeForce RTX 4070";
        pc.formFactor = "Mid Tower";
        pc.powerSupplyWattage = 750;
        pc.operatingSystem = "Windows 11 Home";
      } else if (product.name.includes("MSI Aegis RS 13")) {
        pc.brand = "MSI";
        pc.model = "Aegis RS 13";
        pc.processor = "Intel Core i7-13700F";
        pc.ramGb = 16;
        pc.storageGb = 1000;
        pc.storageType = "NVMe SSD";
        pc.graphics = "NVIDIA GeForce RTX 4060 Ti";
        pc.formFactor = "Mid Tower";
        pc.powerSupplyWattage = 650;
        pc.operatingSystem = "Windows 11 Home";
      } else if (product.name.includes("HP Z6 G5 Workstation")) {
        pc.brand = "HP";
        pc.model = "Z6 G5 Workstation";
        pc.processor = "Intel Xeon W-2400";
        pc.ramGb = 64;
        pc.storageGb = 2000;
        pc.storageType = "NVMe SSD";
        pc.graphics = "NVIDIA RTX A6000";
        pc.formFactor = "Full Tower";
        pc.powerSupplyWattage = 1125;
        pc.operatingSystem = "Windows 11 Pro";
      } else if (product.name.includes("Dell Precision 7000")) {
        pc.brand = "Dell";
        pc.model = "Precision 7000";
        pc.processor = "Intel Core i9-13900";
        pc.ramGb = 32;
        pc.storageGb = 1000;
        pc.storageType = "NVMe SSD";
        pc.graphics = "NVIDIA RTX A5000";
        pc.formFactor = "Mid Tower";
        pc.powerSupplyWattage = 850;
        pc.operatingSystem = "Windows 11 Pro";
      } else if (product.name.includes("HP Pavilion Desktop")) {
        pc.brand = "HP";
        pc.model = "Pavilion Desktop";
        pc.processor = "AMD Ryzen 5 5600G";
        pc.ramGb = 16;
        pc.storageGb = 512;
        pc.storageType = "SATA SSD";
        pc.graphics = "NVIDIA GTX 1660";
        pc.formFactor = "Mid Tower";
        pc.powerSupplyWattage = 500;
        pc.operatingSystem = "Windows 11 Home";
      } else if (product.name.includes("ASUS VivoPC Mini")) {
        pc.brand = "ASUS";
        pc.model = "VivoPC Mini";
        pc.processor = "Intel Core i5-12400";
        pc.ramGb = 8;
        pc.storageGb = 256;
        pc.storageType = "SATA SSD";
        pc.graphics = "Intel UHD Graphics";
        pc.formFactor = "Mini ITX";
        pc.powerSupplyWattage = 90;
        pc.operatingSystem = "Windows 11 Home";
      } else if (product.name.includes("Acer Aspire TC Desktop")) {
        pc.brand = "Acer";
        pc.model = "Aspire TC";
        pc.processor = "AMD Ryzen 3 5300G";
        pc.ramGb = 8;
        pc.storageGb = 512;
        pc.storageType = "SATA SSD";
        pc.graphics = "AMD Radeon Graphics";
        pc.formFactor = "Mid Tower";
        pc.powerSupplyWattage = 350;
        pc.operatingSystem = "Windows 11 Home";
      }

      if (pc.brand == null) {


        console.log(`Skip PC component (no mapping): ${product.name}`);


        continue;


      }


      const _ex_pc = await PC.findOne({ product: product.id });


      if (_ex_pc) {


        console.log(`Skip PC component (exists): ${product.name}`);


        continue;


      }


      await pc.save();


      savedPCComponents.push(pc);


      console.log(`Added PC component for: ${product.name}`);
    }

    console.log(`Successfully added ${savedPCComponents.length} PC component records`);
    return savedPCComponents;
  }

// Add this new function at the end of the file or after the existing RAM section
export async function addMoreDDR5Rams() {
  const savedProducts: Product[] = [];
  const ramCategory = await Category.findOne({
    name: "RAM",
  });
  if (!ramCategory) {
    throw new Error("RAM category not found");
  }
  const product100: Product = new Product();
  product100.name = "Corsair Dominator Platinum RGB 32GB DDR5-6000";
  product100.price = 4990000;
  product100.description =
    "Corsair Dominator Platinum RGB 32GB (2x16GB) DDR5-6000MHz";
  product100.category = ramCategory;
  await saveProductIfNotExists(product100);

  const product101: Product = new Product();
  product101.name = "G.Skill Ripjaws S5 32GB DDR5-5600";
  product101.price = 4290000;
  product101.description = "G.Skill Ripjaws S5 32GB (2x16GB) DDR5-5600MHz";
  product101.category = ramCategory;
  const _saved_product101 = await saveProductIfNotExists(product101);
  if (_saved_product101) savedProducts.push(_saved_product101);

  const product102: Product = new Product();
  product102.name = "Kingston Fury Beast 32GB DDR5-6000";
  product102.price = 4590000;
  product102.description = "Kingston Fury Beast 32GB (2x16GB) DDR5-6000MHz";
  product102.category = ramCategory;
  const _saved_product102 = await saveProductIfNotExists(product102);
  if (_saved_product102) savedProducts.push(_saved_product102);

  const product103: Product = new Product();
  product103.name = "TeamGroup T-Force Delta RGB 32GB DDR5-6400";
  product103.price = 5690000;
  product103.description = "TeamGroup T-Force Delta RGB 32GB (2x16GB) DDR5-6400MHz";
  product103.category = ramCategory;
  const _saved_product103 = await saveProductIfNotExists(product103);
  if (_saved_product103) savedProducts.push(_saved_product103);

  const product104: Product = new Product();
  product104.name = "Crucial Pro 32GB DDR5-5600";
  product104.price = 3990000;
  product104.description = "Crucial Pro 32GB (2x16GB) DDR5-5600MHz";
  product104.category = ramCategory;
  const _saved_product104 = await saveProductIfNotExists(product104);
  if (_saved_product104) savedProducts.push(_saved_product104);

  const product105: Product = new Product();
  product105.name = "Patriot Viper Venom 32GB DDR5-6200";
  product105.price = 4890000;
  product105.description = "Patriot Viper Venom 32GB (2x16GB) DDR5-6200MHz";
  product105.category = ramCategory;
  const _saved_product105 = await saveProductIfNotExists(product105);
  if (_saved_product105) savedProducts.push(_saved_product105);

  const product106: Product = new Product();
  product106.name = "ADATA XPG Lancer RGB 32GB DDR5-6000";
  product106.price = 4790000;
  product106.description = "ADATA XPG Lancer RGB 32GB (2x16GB) DDR5-6000MHz";
  product106.category = ramCategory;
  const _saved_product106 = await saveProductIfNotExists(product106);
  if (_saved_product106) savedProducts.push(_saved_product106);

  const product107: Product = new Product();
  product107.name = "PNY XLR8 Gaming 32GB DDR5-6000";
  product107.price = 4690000;
  product107.description = "PNY XLR8 Gaming 32GB (2x16GB) DDR5-6000MHz";
  product107.category = ramCategory;
  const _saved_product107 = await saveProductIfNotExists(product107);
  if (_saved_product107) savedProducts.push(_saved_product107);

  const product108: Product = new Product();
  product108.name = "Samsung 32GB DDR5-4800";
  product108.price = 3590000;
  product108.description = "Samsung 32GB (2x16GB) DDR5-4800MHz";
  product108.category = ramCategory;
  const _saved_product108 = await saveProductIfNotExists(product108);
  if (_saved_product108) savedProducts.push(_saved_product108);

  const product109: Product = new Product();
  product109.name = "Lexar ARES RGB 32GB DDR5-5600";
  product109.price = 4190000;
  product109.description = "Lexar ARES RGB 32GB (2x16GB) DDR5-5600MHz";
  product109.category = ramCategory;
  const _saved_product109 = await saveProductIfNotExists(product109);
  if (_saved_product109) savedProducts.push(_saved_product109);
  return savedProducts;
}

// Add new DDR5 RAM components for the new products
export async function addDetailedDDR5RamComponents() {
  // 1. Corsair Dominator Platinum RGB 32GB DDR5-6000
  const product100 = await Product.findOne({
    name: "Corsair Dominator Platinum RGB 32GB DDR5-6000",
    relations: ["category"],
  });
  if (product100) {
    const ram100 = new RAM();
    ram100.product = product100;
    ram100.brand = "Corsair";
    ram100.model = "Dominator Platinum RGB";
    ram100.capacityGb = 32;
    ram100.speedMhz = 6000;
    ram100.type = "DDR5";
    await saveComponentIfNotExists(ram100, RAM, product100.name, `Added RAM component for: ${product100.name}`);
  }

  // 2. G.Skill Ripjaws S5 32GB DDR5-5600
  const product101 = await Product.findOne({
    name: "G.Skill Ripjaws S5 32GB DDR5-5600",
    relations: ["category"],
  });
  if (product101) {
    const ram101 = new RAM();
    ram101.product = product101;
    ram101.brand = "G.Skill";
    ram101.model = "Ripjaws S5";
    ram101.capacityGb = 32;
    ram101.speedMhz = 5600;
    ram101.type = "DDR5";
    await saveComponentIfNotExists(ram101, RAM, product101.name, `Added RAM component for: ${product101.name}`);
  }

  // 3. Kingston Fury Beast 32GB DDR5-6000
  const product102 = await Product.findOne({
    name: "Kingston Fury Beast 32GB DDR5-6000",
    relations: ["category"],
  });
  if (product102) {
    const ram102 = new RAM();
    ram102.product = product102;
    ram102.brand = "Kingston";
    ram102.model = "Fury Beast";
    ram102.capacityGb = 32;
    ram102.speedMhz = 6000;
    ram102.type = "DDR5";
    await saveComponentIfNotExists(ram102, RAM, product102.name, `Added RAM component for: ${product102.name}`);
  }

  // 4. TeamGroup T-Force Delta RGB 32GB DDR5-6400
  const product103 = await Product.findOne({
    name: "TeamGroup T-Force Delta RGB 32GB DDR5-6400",
    relations: ["category"],
  });
  if (product103) {
    const ram103 = new RAM();
    ram103.product = product103;
    ram103.brand = "TeamGroup";
    ram103.model = "T-Force Delta RGB";
    ram103.capacityGb = 32;
    ram103.speedMhz = 6400;
    ram103.type = "DDR5";
    await saveComponentIfNotExists(ram103, RAM, product103.name, `Added RAM component for: ${product103.name}`);
  }

  // 5. Crucial Pro 32GB DDR5-5600
  const product104 = await Product.findOne({
    name: "Crucial Pro 32GB DDR5-5600",
    relations: ["category"],
  });
  if (product104) {
    const ram104 = new RAM();
    ram104.product = product104;
    ram104.brand = "Crucial";
    ram104.model = "Pro";
    ram104.capacityGb = 32;
    ram104.speedMhz = 5600;
    ram104.type = "DDR5";
    await saveComponentIfNotExists(ram104, RAM, product104.name, `Added RAM component for: ${product104.name}`);
  }

  // 6. Patriot Viper Venom 32GB DDR5-6200
  const product105 = await Product.findOne({
    name: "Patriot Viper Venom 32GB DDR5-6200",
    relations: ["category"],
  });
  if (product105) {
    const ram105 = new RAM();
    ram105.product = product105;
    ram105.brand = "Patriot";
    ram105.model = "Viper Venom";
    ram105.capacityGb = 32;
    ram105.speedMhz = 6200;
    ram105.type = "DDR5";
    await saveComponentIfNotExists(ram105, RAM, product105.name, `Added RAM component for: ${product105.name}`);
  }

  // 7. ADATA XPG Lancer RGB 32GB DDR5-6000
  const product106 = await Product.findOne({
    name: "ADATA XPG Lancer RGB 32GB DDR5-6000",
    relations: ["category"],
  });
  if (product106) {
    const ram106 = new RAM();
    ram106.product = product106;
    ram106.brand = "ADATA";
    ram106.model = "XPG Lancer RGB";
    ram106.capacityGb = 32;
    ram106.speedMhz = 6000;
    ram106.type = "DDR5";
    await saveComponentIfNotExists(ram106, RAM, product106.name, `Added RAM component for: ${product106.name}`);
  }

  // 8. PNY XLR8 Gaming 32GB DDR5-6000
  const product107 = await Product.findOne({
    name: "PNY XLR8 Gaming 32GB DDR5-6000",
    relations: ["category"],
  });
  if (product107) {
    const ram107 = new RAM();
    ram107.product = product107;
    ram107.brand = "PNY";
    ram107.model = "XLR8 Gaming";
    ram107.capacityGb = 32;
    ram107.speedMhz = 6000;
    ram107.type = "DDR5";
    await saveComponentIfNotExists(ram107, RAM, product107.name, `Added RAM component for: ${product107.name}`);
  }

  // 9. Samsung 32GB DDR5-4800
  const product108 = await Product.findOne({
    name: "Samsung 32GB DDR5-4800",
    relations: ["category"],
  });
  if (product108) {
    const ram108 = new RAM();
    ram108.product = product108;
    ram108.brand = "Samsung";
    ram108.model = "DDR5-4800";
    ram108.capacityGb = 32;
    ram108.speedMhz = 4800;
    ram108.type = "DDR5";
    await saveComponentIfNotExists(ram108, RAM, product108.name, `Added RAM component for: ${product108.name}`);
  }

  // 10. Lexar ARES RGB 32GB DDR5-5600
  const product109 = await Product.findOne({
    name: "Lexar ARES RGB 32GB DDR5-5600",
    relations: ["category"],
  });
  if (product109) {
    const ram109 = new RAM();
    ram109.product = product109;
    ram109.brand = "Lexar";
    ram109.model = "ARES RGB";
    ram109.capacityGb = 32;
    ram109.speedMhz = 5600;
    ram109.type = "DDR5";
    await saveComponentIfNotExists(ram109, RAM, product109.name, `Added RAM component for: ${product109.name}`);
  }
  console.log("Successfully added all detailed DDR5 RAM components.");
}

// Add sample products and components for each type in Laptop.md
export async function addSampleProductsFromLaptopMd() {
  // 1. Laptop
  const laptopCategory = await Category.findOne({ slug: "laptop" });
  if (laptopCategory) {
    const laptopProduct = new Product();
    laptopProduct.name = "ASUS ROG Zephyrus G14";
    laptopProduct.price = 34990000;
    laptopProduct.description =
      "ASUS ROG Zephyrus G14 Gaming Laptop with AMD Ryzen 9 and RTX 4060";
    laptopProduct.category = laptopCategory;
    await saveProductIfNotExists(laptopProduct);
    const laptop = new Laptop();
    laptop.product = laptopProduct;
    laptop.brand = "Asus";
    laptop.model = "ROG Zephyrus G14";
    laptop.screenSize = 14.0;
    laptop.screenType = "IPS";
    laptop.resolution = "2560x1600";
    laptop.batteryLifeHours = 8.0;
    laptop.weightKg = 1.7;
    laptop.os = "Windows 11";
    laptop.ramCount = 2;
    await saveComponentIfNotExists(laptop, Laptop, laptopProduct.name, `Added Laptop: ${laptopProduct.name}`);
  }

  // 2. RAM
  const ramCategory = await Category.findOne({ slug: "ram" });
  if (ramCategory) {
    const ramProduct = new Product();
    ramProduct.name = "G.Skill Trident Z5 RGB 32GB DDR5-6000";
    ramProduct.price = 3990000;
    ramProduct.description =
      "G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5-6000MHz";
    ramProduct.category = ramCategory;
    await saveProductIfNotExists(ramProduct);
    const ram = new RAM();
    ram.product = ramProduct;
    ram.brand = "G.Skill";
    ram.model = "Trident Z5 RGB";
    ram.capacityGb = 32;
    ram.speedMhz = 6000;
    ram.type = "DDR5";
    await saveComponentIfNotExists(ram, RAM, ramProduct.name, `Added RAM: ${ramProduct.name}`);
  }

  // 3. CPU
  const cpuCategory = await Category.findOne({ slug: "cpu" });
  if (cpuCategory) {
    const cpuProduct = new Product();
    cpuProduct.name = "Intel Core i7-13700K";
    cpuProduct.price = 11990000;
    cpuProduct.description =
      "Intel Core i7-13700K 16-Core Processor with Intel UHD Graphics 770";
    cpuProduct.category = cpuCategory;
    await saveProductIfNotExists(cpuProduct);
    const cpu = new CPU();
    cpu.product = cpuProduct;
    cpu.cores = 16;
    cpu.threads = 24;
    cpu.baseClock = "3.4 GHz";
    cpu.boostClock = "5.4 GHz";
    cpu.socket = "LGA 1700";
    cpu.architecture = "Raptor Lake";
    cpu.tdp = 253;
    cpu.integratedGraphics = "Intel UHD Graphics 770";
    await saveComponentIfNotExists(cpu, CPU, cpuProduct.name, `Added CPU: ${cpuProduct.name}`);
  }

  // 4. GPU
  const gpuCategory = await Category.findOne({ slug: "gpu" });
  if (gpuCategory) {
    const gpuProduct = new Product();
    gpuProduct.name = "NVIDIA GeForce RTX 4070 Ti";
    gpuProduct.price = 22990000;
    gpuProduct.description =
      "NVIDIA GeForce RTX 4070 Ti 12GB GDDR6X Graphics Card";
    gpuProduct.category = gpuCategory;
    await saveProductIfNotExists(gpuProduct);
    const gpu = new GPU();
    gpu.product = gpuProduct;
    gpu.brand = "NVIDIA";
    gpu.model = "GeForce RTX 4070 Ti";
    gpu.vram = 12;
    gpu.chipset = "AD104";
    gpu.memoryType = "GDDR6X";
    gpu.lengthMm = 285;
    gpu.tdp = 285;
    await saveComponentIfNotExists(gpu, GPU, gpuProduct.name, `Added GPU: ${gpuProduct.name}`);
  }

  // 5. Monitor
  const monitorCategory = await Category.findOne({
    slug: "monitor",
  });
  if (monitorCategory) {
    const monitorProduct = new Product();
    monitorProduct.name = "LG UltraGear 27GP850-B";
    monitorProduct.price = 8990000;
    monitorProduct.description =
      "LG UltraGear 27GP850-B 27-inch 1440p 165Hz Gaming Monitor";
    monitorProduct.category = monitorCategory;
    await saveProductIfNotExists(monitorProduct);
    const monitor = new Monitor();
    monitor.product = monitorProduct;
    monitor.brand = "LG";
    monitor.model = "27GP850-B";
    monitor.sizeInch = 27.0;
    monitor.resolution = "2560x1440";
    monitor.refreshRate = 165;
    monitor.panelType = "IPS";
    await saveComponentIfNotExists(monitor, Monitor, monitorProduct.name, `Added Monitor: ${monitorProduct.name}`);
  }

  // 6. Motherboard
  const motherboardCategory = await Category.findOne({
    slug: "motherboard",
  });
  if (motherboardCategory) {
    const mbProduct = new Product();
    mbProduct.name = "ASUS ROG Strix Z690-A";
    mbProduct.price = 7990000;
    mbProduct.description =
      "ASUS ROG Strix Z690-A Gaming WiFi D4 ATX Motherboard";
    mbProduct.category = motherboardCategory;
    await saveProductIfNotExists(mbProduct);
    const mb = new Motherboard();
    mb.product = mbProduct;
    mb.brand = "ASUS";
    mb.model = "ROG Strix Z690-A";
    mb.chipset = "Intel Z690";
    mb.socket = "LGA 1700";
    mb.formFactor = "ATX";
    mb.ramSlots = 4;
    mb.maxRam = 128;
    mb.ramType = "DDR4";
    await mb.save();
    console.log(`Added Motherboard: ${mbProduct.name}`);
  }

  // 7. PSU
  const psuCategory = await Category.findOne({ slug: "psu" });
  if (psuCategory) {
    const psuProduct = new Product();
    psuProduct.name = "Corsair RM850x 850W 80+ Gold";
    psuProduct.price = 3990000;
    psuProduct.description = "Corsair RM850x 850W 80+ Gold Fully Modular PSU";
    psuProduct.category = psuCategory;
    await saveProductIfNotExists(psuProduct);
    const psu = new PSU();
    psu.product = psuProduct;
    psu.brand = "Corsair";
    psu.model = "RM850x";
    psu.wattage = 850;
    psu.efficiencyRating = "80+ Gold";
    psu.modular = "Fully Modular";
    await saveComponentIfNotExists(psu, PSU, psuProduct.name, `Added PSU: ${psuProduct.name}`);
  }

  // 8. Drive
  const driveCategory = await Category.findOne({ slug: "drive" });
  if (driveCategory) {
    const driveProduct = new Product();
    driveProduct.name = "Samsung 980 PRO 1TB NVMe SSD";
    driveProduct.price = 2990000;
    driveProduct.description = "Samsung 980 PRO 1TB NVMe PCIe Gen4 SSD";
    driveProduct.category = driveCategory;
    await saveProductIfNotExists(driveProduct);
    const drive = new Drive();
    drive.product = driveProduct;
    drive.brand = "Samsung";
    drive.model = "980 PRO";
    drive.type = "SSD";
    drive.capacityGb = 1000;
    drive.interface = "NVMe M.2";
    await saveComponentIfNotExists(drive, Drive, driveProduct.name, `Added Drive: ${driveProduct.name}`);
  }

  // 9. Cooler
  const coolerCategory = await Category.findOne({ slug: "cooler" });
  if (coolerCategory) {
    const coolerProduct = new Product();
    coolerProduct.name = "Noctua NH-D15";
    coolerProduct.price = 2490000;
    coolerProduct.description = "Noctua NH-D15 Premium CPU Air Cooler";
    coolerProduct.category = coolerCategory;
    await saveProductIfNotExists(coolerProduct);
    const cooler = new Cooler();
    cooler.product = coolerProduct;
    cooler.brand = "Noctua";
    cooler.model = "NH-D15";
    cooler.type = "Air";
    cooler.supportedSockets = "LGA 1700, AM4, AM5";
    cooler.fanSizeMm = 140;
    await cooler.save();
    console.log(`Added Cooler: ${coolerProduct.name}`);
  }

  // 10. Case
  const caseCategory = await Category.findOne({ slug: "case" });
  if (caseCategory) {
    const caseProduct = new Product();
    caseProduct.name = "NZXT H510 Elite";
    caseProduct.price = 3990000;
    caseProduct.description =
      "NZXT H510 Elite Mid-Tower ATX Case with Tempered Glass";
    caseProduct.category = caseCategory;
    await saveProductIfNotExists(caseProduct);
    const caseComponent = new Case();
    caseComponent.product = caseProduct;
    caseComponent.brand = "NZXT";
    caseComponent.model = "H510 Elite";
    caseComponent.formFactorSupport = "ATX, mATX, ITX";
    caseComponent.hasRgb = true;
    caseComponent.sidePanelType = "Tempered Glass";
    caseComponent.maxGpuLengthMm = 381;
    caseComponent.psuType = "ATX";
    await saveComponentIfNotExists(caseComponent, Case, caseProduct.name, `Added Case: ${caseProduct.name}`);
  }

  console.log(
    "Successfully added sample products and components from Laptop.md"
  );
}

// Add more popularized sample products and components for each type in Laptop.md
export async function addPopularizedSampleProductsFromLaptopMd() {
  // Laptops
  const laptopCategory = await Category.findOne({ slug: "laptop" });
  if (laptopCategory) {
    const laptops = [
      {
        name: "Dell XPS 13 Plus",
        price: 32990000,
        description: "Dell XPS 13 Plus Ultrabook with Intel Core i7",
        brand: "Dell",
        model: "XPS 13 Plus",
        screenSize: 13.4,
        screenType: "OLED",
        resolution: "3456x2160",
        batteryLifeHours: 10.0,
        weightKg: 1.2,
        os: "Windows 11",
        ramCount: 2,
      },
      {
        name: "MacBook Pro 16-inch M3",
        price: 59990000,
        description: "Apple MacBook Pro 16-inch with M3 Pro chip",
        brand: "Apple",
        model: "MacBook Pro 16-inch M3",
        screenSize: 16.2,
        screenType: "Liquid Retina XDR",
        resolution: "3456x2234",
        batteryLifeHours: 18.0,
        weightKg: 2.1,
        os: "macOS",
        ramCount: 1,
      },
      {
        name: "HP Spectre x360 14",
        price: 28990000,
        description: "HP Spectre x360 14 2-in-1 Laptop with Intel Core i7",
        brand: "HP",
        model: "Spectre x360 14",
        screenSize: 13.5,
        screenType: "IPS Touch",
        resolution: "1920x1280",
        batteryLifeHours: 11.0,
        weightKg: 1.3,
        os: "Windows 11",
        ramCount: 2,
      },
    ];
    for (const l of laptops) {
      if (!(await Product.findOne({ name: l.name }))) {
        const laptopProduct = new Product();
        laptopProduct.name = l.name;
        laptopProduct.price = l.price;
        laptopProduct.description = l.description;
        laptopProduct.category = laptopCategory;
        await saveProductIfNotExists(laptopProduct);
        const laptop = new Laptop();
        laptop.product = laptopProduct;
        laptop.brand = l.brand;
        laptop.model = l.model;
        laptop.screenSize = l.screenSize;
        laptop.screenType = l.screenType;
        laptop.resolution = l.resolution;
        laptop.batteryLifeHours = l.batteryLifeHours;
        laptop.weightKg = l.weightKg;
        laptop.os = l.os;
        laptop.ramCount = l.ramCount;
        await saveComponentIfNotExists(laptop, Laptop, laptopProduct.name, `Added Laptop: ${laptopProduct.name}`);
      }
    }
  }

  // RAM
  const ramCategory = await Category.findOne({ slug: "ram" });
  if (ramCategory) {
    const rams = [
      {
        name: "Corsair Vengeance 16GB DDR4-3200",
        price: 1590000,
        description: "Corsair Vengeance 16GB (2x8GB) DDR4-3200MHz",
        brand: "Corsair",
        model: "Vengeance",
        capacityGb: 16,
        speedMhz: 3200,
        type: "DDR4",
      },
      {
        name: "Kingston Fury Beast 32GB DDR5-5600",
        price: 3690000,
        description: "Kingston Fury Beast 32GB (2x16GB) DDR5-5600MHz",
        brand: "Kingston",
        model: "Fury Beast",
        capacityGb: 32,
        speedMhz: 5600,
        type: "DDR5",
      },
      {
        name: "TeamGroup T-Force Delta RGB 16GB DDR4-3200",
        price: 1290000,
        description: "TeamGroup T-Force Delta RGB 16GB (2x8GB) DDR4-3200MHz",
        brand: "TeamGroup",
        model: "T-Force Delta RGB",
        capacityGb: 16,
        speedMhz: 3200,
        type: "DDR4",
      },
      {
        name: "Crucial Ballistix 32GB DDR4-3600",
        price: 1990000,
        description: "Crucial Ballistix 32GB (2x16GB) DDR4-3600MHz",
        brand: "Crucial",
        model: "Ballistix",
        capacityGb: 32,
        speedMhz: 3600,
        type: "DDR4",
      },
    ];
    for (const r of rams) {
      if (!(await Product.findOne({ name: r.name }))) {
        const ramProduct = new Product();
        ramProduct.name = r.name;
        ramProduct.price = r.price;
        ramProduct.description = r.description;
        ramProduct.category = ramCategory;
        await saveProductIfNotExists(ramProduct);
        const ram = new RAM();
        ram.product = ramProduct;
        ram.brand = r.brand;
        ram.model = r.model;
        ram.capacityGb = r.capacityGb;
        ram.speedMhz = r.speedMhz;
        ram.type = r.type;
        await saveComponentIfNotExists(ram, RAM, ramProduct.name, `Added RAM: ${ramProduct.name}`);
      }
    }
  }

  // CPU
  const cpuCategory = await Category.findOne({ slug: "cpu" });
  if (cpuCategory) {
    const cpus = [
      {
        name: "AMD Ryzen 7 5800X",
        price: 7990000,
        description: "AMD Ryzen 7 5800X 8-Core Processor",
        cores: 8,
        threads: 16,
        baseClock: "3.8 GHz",
        boostClock: "4.7 GHz",
        socket: "AM4",
        architecture: "Zen 3",
        tdp: 105,
        integratedGraphics: "",
      },
      {
        name: "Intel Core i5-12400F",
        price: 4990000,
        description: "Intel Core i5-12400F 6-Core Processor",
        cores: 6,
        threads: 12,
        baseClock: "2.5 GHz",
        boostClock: "4.4 GHz",
        socket: "LGA 1700",
        architecture: "Alder Lake",
        tdp: 65,
        integratedGraphics: "",
      },
      {
        name: "Intel Core i9-13900K",
        price: 15990000,
        description:
          "Intel Core i9-13900K 24-Core Processor with Intel UHD Graphics 770",
        cores: 24,
        threads: 32,
        baseClock: "3.0 GHz",
        boostClock: "5.8 GHz",
        socket: "LGA 1700",
        architecture: "Raptor Lake",
        tdp: 253,
        integratedGraphics: "Intel UHD Graphics 770",
      },
      {
        name: "AMD Ryzen 5 5600X",
        price: 3990000,
        description: "AMD Ryzen 5 5600X 6-Core Processor",
        cores: 6,
        threads: 12,
        baseClock: "3.7 GHz",
        boostClock: "4.6 GHz",
        socket: "AM4",
        architecture: "Zen 3",
        tdp: 65,
        integratedGraphics: "",
      },
    ];
    for (const c of cpus) {
      if (!(await Product.findOne({ name: c.name }))) {
        const cpuProduct = new Product();
        cpuProduct.name = c.name;
        cpuProduct.price = c.price;
        cpuProduct.description = c.description;
        cpuProduct.category = cpuCategory;
        await saveProductIfNotExists(cpuProduct);
        const cpu = new CPU();
        cpu.product = cpuProduct;
        cpu.cores = c.cores;
        cpu.threads = c.threads;
        cpu.baseClock = c.baseClock;
        cpu.boostClock = c.boostClock;
        cpu.socket = c.socket;
        cpu.architecture = c.architecture;
        cpu.tdp = c.tdp;
        cpu.integratedGraphics = c.integratedGraphics;
        await saveComponentIfNotExists(cpu, CPU, cpuProduct.name, `Added CPU: ${cpuProduct.name}`);
      }
    }
  }

  // GPU
  const gpuCategory = await Category.findOne({ slug: "gpu" });
  if (gpuCategory) {
    const gpus = [
      {
        name: "AMD Radeon RX 7900 XTX",
        price: 29990000,
        description: "AMD Radeon RX 7900 XTX 24GB GDDR6 Graphics Card",
        brand: "AMD",
        model: "Radeon RX 7900 XTX",
        vram: 24,
        chipset: "Navi 31",
        memoryType: "GDDR6",
        lengthMm: 287,
        tdp: 355,
      },
      {
        name: "NVIDIA GeForce RTX 4060 Ti",
        price: 15990000,
        description: "NVIDIA GeForce RTX 4060 Ti 8GB GDDR6 Graphics Card",
        brand: "NVIDIA",
        model: "GeForce RTX 4060 Ti",
        vram: 8,
        chipset: "AD106",
        memoryType: "GDDR6",
        lengthMm: 242,
        tdp: 160,
      },
      {
        name: "AMD Radeon RX 6700 XT",
        price: 11990000,
        description: "AMD Radeon RX 6700 XT 12GB GDDR6 Graphics Card",
        brand: "AMD",
        model: "Radeon RX 6700 XT",
        vram: 12,
        chipset: "Navi 22",
        memoryType: "GDDR6",
        lengthMm: 267,
        tdp: 230,
      },
    ];
    for (const g of gpus) {
      if (!(await Product.findOne({ name: g.name }))) {
        const gpuProduct = new Product();
        gpuProduct.name = g.name;
        gpuProduct.price = g.price;
        gpuProduct.description = g.description;
        gpuProduct.category = gpuCategory;
        await saveProductIfNotExists(gpuProduct);
        const gpu = new GPU();
        gpu.product = gpuProduct;
        gpu.brand = g.brand;
        gpu.model = g.model;
        gpu.vram = g.vram;
        gpu.chipset = g.chipset;
        gpu.memoryType = g.memoryType;
        gpu.lengthMm = g.lengthMm;
        gpu.tdp = g.tdp;
        await saveComponentIfNotExists(gpu, GPU, gpuProduct.name, `Added GPU: ${gpuProduct.name}`);
      }
    }
  }

  // Monitor
  const monitorCategory = await Category.findOne({
    slug: "monitor",
  });
  if (monitorCategory) {
    const monitors = [
      {
        name: "Samsung Odyssey G7",
        price: 15990000,
        description: "Samsung Odyssey G7 32-inch 240Hz QHD Gaming Monitor",
        brand: "Samsung",
        model: "Odyssey G7",
        sizeInch: 32.0,
        resolution: "2560x1440",
        refreshRate: 240,
        panelType: "VA",
      },
      {
        name: "ASUS ROG Swift PG279Q",
        price: 12990000,
        description: "ASUS ROG Swift PG279Q 27-inch 1440p 165Hz Gaming Monitor",
        brand: "ASUS",
        model: "ROG Swift PG279Q",
        sizeInch: 27.0,
        resolution: "2560x1440",
        refreshRate: 165,
        panelType: "IPS",
      },
      {
        name: "AOC CU34G2X",
        price: 8990000,
        description: "AOC CU34G2X 34-inch Ultrawide Gaming Monitor",
        brand: "AOC",
        model: "CU34G2X",
        sizeInch: 34.0,
        resolution: "3440x1440",
        refreshRate: 144,
        panelType: "VA",
      },
    ];
    for (const m of monitors) {
      if (!(await Product.findOne({ name: m.name }))) {
        const monitorProduct = new Product();
        monitorProduct.name = m.name;
        monitorProduct.price = m.price;
        monitorProduct.description = m.description;
        monitorProduct.category = monitorCategory;
        await saveProductIfNotExists(monitorProduct);
        const monitor = new Monitor();
        monitor.product = monitorProduct;
        monitor.brand = m.brand;
        monitor.model = m.model;
        monitor.sizeInch = m.sizeInch;
        monitor.resolution = m.resolution;
        monitor.refreshRate = m.refreshRate;
        monitor.panelType = m.panelType;
        await saveComponentIfNotExists(monitor, Monitor, monitorProduct.name, `Added Monitor: ${monitorProduct.name}`);
      }
    }
  }

  // Motherboard
  const motherboardCategory = await Category.findOne({
    slug: "motherboard",
  });
  if (motherboardCategory) {
    const motherboards = [
      {
        name: "MSI MPG B650 Carbon WiFi",
        price: 5990000,
        description: "MSI MPG B650 Carbon WiFi AMD B650 ATX Motherboard",
        brand: "MSI",
        model: "MPG B650 Carbon WiFi",
        chipset: "AMD B650",
        socket: "AM5",
        formFactor: "ATX",
        ramSlots: 4,
        maxRam: 128,
        ramType: "DDR5",
      },
      {
        name: "ASUS TUF Gaming B760M-Plus WiFi",
        price: 4490000,
        description:
          "ASUS TUF Gaming B760M-Plus WiFi Intel B760 mATX Motherboard",
        brand: "ASUS",
        model: "TUF Gaming B760M-Plus WiFi",
        chipset: "Intel B760",
        socket: "LGA 1700",
        formFactor: "mATX",
        ramSlots: 4,
        maxRam: 128,
        ramType: "DDR4",
      },
      {
        name: "Gigabyte B760 Aorus Elite",
        price: 4990000,
        description: "Gigabyte B760 Aorus Elite Intel B760 ATX Motherboard",
        brand: "Gigabyte",
        model: "B760 Aorus Elite",
        chipset: "Intel B760",
        socket: "LGA 1700",
        formFactor: "ATX",
        ramSlots: 4,
        maxRam: 128,
        ramType: "DDR4",
      },
    ];
    for (const mb of motherboards) {
      if (!(await Product.findOne({ name: mb.name }))) {
        const mbProduct = new Product();
        mbProduct.name = mb.name;
        mbProduct.price = mb.price;
        mbProduct.description = mb.description;
        mbProduct.category = motherboardCategory;
        await saveProductIfNotExists(mbProduct);
        const motherboard = new Motherboard();
        motherboard.product = mbProduct;
        motherboard.brand = mb.brand;
        motherboard.model = mb.model;
        motherboard.chipset = mb.chipset;
        motherboard.socket = mb.socket;
        motherboard.formFactor = mb.formFactor;
        motherboard.ramSlots = mb.ramSlots;
        motherboard.maxRam = mb.maxRam;
        motherboard.ramType = mb.ramType;
        await saveComponentIfNotExists(motherboard, Motherboard, mbProduct.name, `Added Motherboard: ${mbProduct.name}`);
      }
    }
  }

  // PSU
  const psuCategory = await Category.findOne({ slug: "psu" });
  if (psuCategory) {
    const psus = [
      {
        name: "Seasonic Focus GX-750",
        price: 2990000,
        description: "Seasonic Focus GX-750 750W 80+ Gold Fully Modular PSU",
        brand: "Seasonic",
        model: "Focus GX-750",
        wattage: 750,
        efficiencyRating: "80+ Gold",
        modular: "Fully Modular",
      },
      {
        name: "Corsair RM1000x 1000W 80+ Gold",
        price: 4990000,
        description: "Corsair RM1000x 1000W 80+ Gold Fully Modular PSU",
        brand: "Corsair",
        model: "RM1000x",
        wattage: 1000,
        efficiencyRating: "80+ Gold",
        modular: "Fully Modular",
      },
      {
        name: "EVGA SuperNOVA 850 G5",
        price: 3990000,
        description: "EVGA SuperNOVA 850 G5 850W 80+ Gold Fully Modular PSU",
        brand: "EVGA",
        model: "SuperNOVA 850 G5",
        wattage: 850,
        efficiencyRating: "80+ Gold",
        modular: "Fully Modular",
      },
    ];
    for (const p of psus) {
      if (!(await Product.findOne({ name: p.name }))) {
        const psuProduct = new Product();
        psuProduct.name = p.name;
        psuProduct.price = p.price;
        psuProduct.description = p.description;
        psuProduct.category = psuCategory;
        await saveProductIfNotExists(psuProduct);
        const psu = new PSU();
        psu.product = psuProduct;
        psu.brand = p.brand;
        psu.model = p.model;
        psu.wattage = p.wattage;
        psu.efficiencyRating = p.efficiencyRating;
        psu.modular = p.modular;
        await saveComponentIfNotExists(psu, PSU, psuProduct.name, `Added PSU: ${psuProduct.name}`);
      }
    }
  }

  // Drive
  const driveCategory = await Category.findOne({ slug: "drive" });
  if (driveCategory) {
    const drives = [
      {
        name: "WD Black SN850X 2TB",
        price: 5990000,
        description: "WD Black SN850X 2TB NVMe M.2 SSD",
        brand: "Western Digital",
        model: "Black SN850X",
        type: "SSD",
        capacityGb: 2000,
        interface: "NVMe M.2",
      },
      {
        name: "Samsung 970 EVO Plus 1TB",
        price: 2990000,
        description: "Samsung 970 EVO Plus 1TB NVMe M.2 SSD",
        brand: "Samsung",
        model: "970 EVO Plus",
        type: "SSD",
        capacityGb: 1000,
        interface: "NVMe M.2",
      },
      {
        name: "Crucial P5 Plus 2TB",
        price: 5990000,
        description: "Crucial P5 Plus 2TB NVMe M.2 SSD",
        brand: "Crucial",
        model: "P5 Plus",
        type: "SSD",
        capacityGb: 2000,
        interface: "NVMe M.2",
      },
    ];
    for (const d of drives) {
      if (!(await Product.findOne({ name: d.name }))) {
        const driveProduct = new Product();
        driveProduct.name = d.name;
        driveProduct.price = d.price;
        driveProduct.description = d.description;
        driveProduct.category = driveCategory;
        await saveProductIfNotExists(driveProduct);
        const drive = new Drive();
        drive.product = driveProduct;
        drive.brand = d.brand;
        drive.model = d.model;
        drive.type = d.type;
        drive.capacityGb = d.capacityGb;
        drive.interface = d.interface;
        await saveComponentIfNotExists(drive, Drive, driveProduct.name, `Added Drive: ${driveProduct.name}`);
      }
    }
  }

  // Cooler
  const coolerCategory = await Category.findOne({ slug: "cooler" });
  if (coolerCategory) {
    const coolers = [
      {
        name: "Noctua NH-D15",
        price: 2490000,
        description: "Noctua NH-D15 Premium CPU Air Cooler",
        brand: "Noctua",
        model: "NH-D15",
        type: "Air",
        supportedSockets: "LGA 1700, AM4, AM5",
        fanSizeMm: 140,
      },
      {
        name: "Noctua NH-U12S",
        price: 1890000,
        description: "Noctua NH-U12S Premium CPU Air Cooler",
        brand: "Noctua",
        model: "NH-U12S",
        type: "Air",
        supportedSockets: "LGA 1700, AM4, AM5",
        fanSizeMm: 120,
      },
      {
        name: "be quiet! Dark Rock Pro 4",
        price: 2490000,
        description: "be quiet! Dark Rock Pro 4 Premium CPU Air Cooler",
        brand: "be quiet!",
        model: "Dark Rock Pro 4",
        type: "Air",
        supportedSockets: "LGA 1700, AM4, AM5",
        fanSizeMm: 120,
      },
    ];
    for (const c of coolers) {
      if (!(await Product.findOne({ name: c.name }))) {
        const coolerProduct = new Product();
        coolerProduct.name = c.name;
        coolerProduct.price = c.price;
        coolerProduct.description = c.description;
        coolerProduct.category = coolerCategory;
        await saveProductIfNotExists(coolerProduct);
        const cooler = new Cooler();
        cooler.product = coolerProduct;
        cooler.brand = c.brand;
        cooler.model = c.model;
        cooler.type = c.type;
        cooler.supportedSockets = c.supportedSockets;
        cooler.fanSizeMm = c.fanSizeMm;
        await cooler.save();
        console.log(`Added Cooler: ${coolerProduct.name}`);
      }
    }
  }

  // Case
  const caseCategory = await Category.findOne({ slug: "case" });
  if (caseCategory) {
    const cases = [
      {
        name: "NZXT H510 Elite",
        price: 3990000,
        description: "NZXT H510 Elite Mid-Tower ATX Case with Tempered Glass",
        brand: "NZXT",
        model: "H510 Elite",
        formFactorSupport: "ATX, mATX, ITX",
        hasRgb: true,
        sidePanelType: "Tempered Glass",
        maxGpuLengthMm: 381,
        psuType: "ATX",
      },
      {
        name: "Lian Li PC-O11 Dynamic",
        price: 4990000,
        description: "Lian Li PC-O11 Dynamic Mid-Tower ATX Case",
        brand: "Lian Li",
        model: "PC-O11 Dynamic",
        formFactorSupport: "ATX, mATX, ITX",
        hasRgb: false,
        sidePanelType: "Tempered Glass",
        maxGpuLengthMm: 420,
        psuType: "ATX",
      },
      {
        name: "Fractal Design Meshify C",
        price: 2990000,
        description: "Fractal Design Meshify C Mid-Tower ATX Case",
        brand: "Fractal Design",
        model: "Meshify C",
        formFactorSupport: "ATX, mATX, ITX",
        hasRgb: false,
        sidePanelType: "Tempered Glass",
        maxGpuLengthMm: 315,
        psuType: "ATX",
      },
      {
        name: "NZXT H7 Flow",
        price: 3990000,
        description: "NZXT H7 Flow Mid-Tower ATX Case",
        brand: "NZXT",
        model: "H7 Flow",
        formFactorSupport: "ATX, mATX, ITX",
        hasRgb: false,
        sidePanelType: "Tempered Glass",
        maxGpuLengthMm: 400,
        psuType: "ATX",
      },
    ];
    for (const c of cases) {
      if (!(await Product.findOne({ name: c.name }))) {
        const caseProduct = new Product();
        caseProduct.name = c.name;
        caseProduct.price = c.price;
        caseProduct.description = c.description;
        caseProduct.category = caseCategory;
        await saveProductIfNotExists(caseProduct);
        const caseComponent = new Case();
        caseComponent.product = caseProduct;
        caseComponent.brand = c.brand;
        caseComponent.model = c.model;
        caseComponent.formFactorSupport = c.formFactorSupport;
        caseComponent.hasRgb = c.hasRgb;
        caseComponent.sidePanelType = c.sidePanelType;
        caseComponent.maxGpuLengthMm = c.maxGpuLengthMm;
        caseComponent.psuType = c.psuType;
        await saveComponentIfNotExists(caseComponent, Case, caseProduct.name, `Added Case: ${caseProduct.name}`);
      }
    }
  }

  console.log(
    "Successfully added popularized sample products and components from Laptop.md"
  );
}


/** Chạy toàn bộ pipeline seed sản phẩm (dữ liệu gốc trong file này) */
export async function runProductSeedPipeline(): Promise<void> {
  const steps: { label: string; run: () => Promise<unknown> }[] = [
    { label: "addProducts", run: addProducts },
    { label: "addToComponents", run: addToComponents },
    { label: "addLaptops", run: addLaptops },
    { label: "addPCs", run: addPCs },
    { label: "addLaptopComponents", run: addLaptopComponents },
    { label: "addPCComponents", run: addPCComponents },
    { label: "addMoreDDR5Rams", run: addMoreDDR5Rams },
    { label: "addDetailedDDR5RamComponents", run: addDetailedDDR5RamComponents },
    { label: "addSampleProductsFromLaptopMd", run: addSampleProductsFromLaptopMd },
    {
      label: "addPopularizedSampleProductsFromLaptopMd",
      run: addPopularizedSampleProductsFromLaptopMd,
    },
  ];
  for (const step of steps) {
    console.log("  -> " + step.label + "...");
    await step.run();
  }
}
