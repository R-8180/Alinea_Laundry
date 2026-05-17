-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 17, 2026 at 12:24 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `alinea_laundry`
--

-- --------------------------------------------------------

--
-- Table structure for table `addresses`
--

CREATE TABLE `addresses` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `label` varchar(100) DEFAULT NULL,
  `address` text NOT NULL,
  `lat` decimal(10,8) DEFAULT NULL,
  `lng` decimal(11,8) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `addresses`
--

INSERT INTO `addresses` (`id`, `user_id`, `label`, `address`, `lat`, `lng`, `is_primary`, `created_at`) VALUES
(1, 1, 'rumah ', 'Kos Khinanti 1A, Taman Siswa, Banaran', NULL, NULL, 0, '2026-05-07 22:18:08'),
(2, 4, 'Rumah', 'kos khinanti 1A, Taman Siswa, Banaran, Gunungpati', NULL, NULL, 0, '2026-05-08 16:03:43'),
(3, 5, 'Rumah', 'Kos Mawaddah 1, Jl. Wideng Sari, CempakaSari, Sekaran', NULL, NULL, 0, '2026-05-08 20:00:22'),
(4, 6, 'Rumah', 'kos putri mawadah 1, cempaka sari, Gunungpati, Semarang', -6.98623239, 110.41958627, 0, '2026-05-09 16:10:47'),
(5, 7, 'Rumah', 'caman raya', NULL, NULL, 0, '2026-05-13 12:32:52'),
(6, 9, 'Rumah', 'Kos Kinanthi 1A, Taman Siswa, Banaran', NULL, NULL, 0, '2026-05-15 01:40:31'),
(7, 9, 'kos', 'Kos Mawaddah 1, Jl. Wideng Sari, CempakaSari, Sekaran', NULL, NULL, 0, '2026-05-15 01:41:33'),
(8, 4, 'kos', 'Perum PIR 5 Blok F26', NULL, NULL, 0, '2026-05-15 08:26:41');

-- --------------------------------------------------------

--
-- Table structure for table `couriers`
--

CREATE TABLE `couriers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `status` enum('available','busy') DEFAULT 'available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `couriers`
--

INSERT INTO `couriers` (`id`, `user_id`, `status`) VALUES
(1, 3, 'available');

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `courier_id` int(11) DEFAULT NULL,
  `order_code` varchar(20) NOT NULL,
  `status` enum('menunggu','pickup','cuci','antar','selesai','batal') DEFAULT 'menunggu',
  `total_price` int(11) DEFAULT 0,
  `payment_status` enum('pending','paid') DEFAULT 'pending',
  `address` varchar(255) DEFAULT NULL,
  `address_id` int(11) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `photo_url` varchar(255) DEFAULT NULL,
  `service_speed` enum('reguler','express') DEFAULT 'reguler',
  `estimated_days` int(11) DEFAULT 0,
  `estimated_hours` int(11) DEFAULT 0,
  `estimated_start` datetime DEFAULT NULL,
  `express_fee` int(11) DEFAULT 0,
  `voucher_code` varchar(20) DEFAULT NULL,
  `discount` int(11) DEFAULT 0,
  `delivery_proof` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `admin_note` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`id`, `user_id`, `courier_id`, `order_code`, `status`, `total_price`, `payment_status`, `address`, `address_id`, `notes`, `photo_url`, `service_speed`, `estimated_days`, `estimated_hours`, `estimated_start`, `express_fee`, `voucher_code`, `discount`, `delivery_proof`, `created_at`, `updated_at`, `admin_note`) VALUES
(1, 1, 3, 'ORD-260517-B50E11', 'selesai', 22000, 'paid', 'Kos Khinanti 1A, Taman Siswa, Banaran', 1, '', '/uploads/order-1778958757018.jpg', 'reguler', 1, 0, '2026-05-17 02:12:37', 0, NULL, 0, '/uploads/delivery-1778960423467.jpg', '2026-05-16 19:12:37', '2026-05-16 19:40:23', 'aman'),
(2, 1, 3, 'ORD-260517-75528B', 'antar', 14000, 'paid', 'Kos Khinanti 1A, Taman Siswa, Banaran', 1, '', NULL, 'reguler', 4, 0, '2026-05-17 02:49:14', 0, NULL, 0, NULL, '2026-05-16 19:49:14', '2026-05-16 22:18:21', 'baju bermasalah');

-- --------------------------------------------------------

--
-- Table structure for table `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `service_id` int(11) DEFAULT NULL,
  `service_type` enum('kiloan','satuan') DEFAULT 'kiloan',
  `name` varchar(100) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT 0.00,
  `qty_items` int(11) DEFAULT 0,
  `price_per_unit` int(11) DEFAULT 0,
  `parfum` varchar(50) DEFAULT NULL,
  `parfum_price` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `service_id`, `service_type`, `name`, `notes`, `weight`, `qty_items`, `price_per_unit`, `parfum`, `parfum_price`) VALUES
(1, 1, 7, 'kiloan', 'baju', '', 1.00, 0, 7000, 'Lavender', 0),
(2, 1, 7, 'satuan', 'Bantal', '', 0.00, 3, 5000, 'Lavender', 0),
(3, 2, 1, 'kiloan', 'baju', '', 2.00, 0, 7000, 'Lavender', 0);

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `payment_proof` varchar(255) DEFAULT NULL,
  `validated` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `order_id`, `payment_proof`, `validated`, `created_at`) VALUES
(1, 1, '/uploads/pay-1778958845417.jpg', 1, '2026-05-16 19:14:05'),
(2, 2, '/uploads/pay-1778961303316.jpg', 1, '2026-05-16 19:55:03');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `category` enum('cuci_setrika','cuci_lipat','satuan') NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` enum('reguler','express') NOT NULL,
  `time_days` int(11) DEFAULT 0,
  `time_hours` int(11) DEFAULT 0,
  `unit_type` enum('kg','pcs') NOT NULL DEFAULT 'kg',
  `price_per_unit` decimal(10,2) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `category`, `name`, `type`, `time_days`, `time_hours`, `unit_type`, `price_per_unit`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'cuci_setrika', 'Reguler 4 Hari', 'reguler', 4, 0, 'kg', 6000.00, 1, '2026-05-15 13:49:44', '2026-05-15 19:37:09'),
(2, 'cuci_setrika', 'Reguler 3 Hari', 'reguler', 3, 0, 'kg', 6000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(3, 'cuci_setrika', 'Reguler 2 Hari', 'reguler', 2, 0, 'kg', 7000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(4, 'cuci_setrika', 'Express 24 Jam', 'express', 1, 0, 'kg', 10000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(5, 'cuci_setrika', 'Express 8 Jam', 'express', 0, 8, 'kg', 12000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(6, 'cuci_setrika', 'Express 2 Jam', 'express', 0, 2, 'kg', 16000.00, 0, '2026-05-15 13:49:44', '2026-05-15 19:58:54'),
(7, 'cuci_lipat', 'Reguler 1 Hari', 'reguler', 1, 0, 'kg', 6000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(8, 'cuci_lipat', 'Reguler 8 Jam', 'reguler', 0, 8, 'kg', 10000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(9, 'cuci_lipat', 'Reguler 2 Jam', 'reguler', 0, 2, 'kg', 14000.00, 0, '2026-05-15 13:49:44', '2026-05-15 19:58:58'),
(10, 'satuan', 'Boneka', 'reguler', 2, 0, 'pcs', 15000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(11, 'satuan', 'Karpet', 'reguler', 3, 0, 'pcs', 20000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(12, 'satuan', 'Sepatu', 'reguler', 2, 0, 'pcs', 18000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(13, 'satuan', 'Bantal', 'reguler', 1, 0, 'pcs', 10000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44'),
(14, 'satuan', 'Lainnya', 'reguler', 2, 0, 'pcs', 10000.00, 1, '2026-05-15 13:49:44', '2026-05-15 13:49:44');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `role` enum('customer','admin','courier') DEFAULT 'customer',
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `points` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `address`, `phone`, `points`, `created_at`) VALUES
(1, 'Bagas', 'bagas@mail.com', '$2b$10$d7cYSaiAtLCMZu0y1yu3le5bnt59T6LFYvVH59PgnxAOyI1NHtsFi', 'customer', 'Jl. Taman Siswa No.50 Semarang', '081227884654', 270, '2026-05-07 22:02:32'),
(2, 'Admin', 'admin@alinea.com', '$2b$10$d7cYSaiAtLCMZu0y1yu3le5bnt59T6LFYvVH59PgnxAOyI1NHtsFi', 'admin', 'Jl. Talangsari No.36A Semarang', '081227884654', 0, '2026-05-07 22:02:32'),
(3, 'Rian', 'rian@mail.com', '$2b$10$d7cYSaiAtLCMZu0y1yu3le5bnt59T6LFYvVH59PgnxAOyI1NHtsFi', 'courier', 'Jl. Melati No.8 Semarang', '08111222333', 0, '2026-05-07 22:02:32'),
(4, 'bagasssss', 'bagaspmltt@gmail.com', '$2b$10$b4MuT8pq445cx1pw/omTYehxSjuqFqxn79KVO7x2GtjhHJ7u32zay', 'customer', 'kos khinanti 1A, Taman Siswa, Banaran, Gunungpati', '081227884654', 120, '2026-05-08 16:03:43'),
(5, 'Mutiara', 'Mutiara@gmail.com', '$2b$10$pr/Ymq4LNrMYqEpwI9D6tuZyRmpmZL6qoxpx3qKd9V3wh1SJgYcVm', 'customer', 'Kos Mawaddah 1, Jl. Wideng Sari, CempakaSari, Sekaran', '081227884088', 20, '2026-05-08 20:00:22'),
(6, 'Mutiara Imam Putri', 'choxophei@gmail.com', '$2b$10$vH1FCObzdyoXz2yObMS5x.Bl7y2Ab2hU6svkgIyHGyFAUpYhzEdSW', 'customer', 'kos putri mawadah 1, cempaka sari, Gunungpati, Semarang', '081227884088', 10, '2026-05-09 16:10:47'),
(7, 'shakyla putri', 'shakylaputri@gmail.com', '$2b$10$F2Vra/0U4lLsc4XRHsz7h.KR3WpvRckxIp18nDKF5pJWaPTSZeCq6', 'customer', 'caman raya', '088219754618', 10, '2026-05-13 12:32:52'),
(9, 'Bagas', 'Muti@gmail.com', '$2b$10$fLTpMj6CzXYM34CuZDmBg.0w/2Q/t2Om1Ik6D.8Fo.XbWW9TL.p3.', 'customer', 'Kos Kinanthi 1A, Taman Siswa, Banaran', '081227884654', 0, '2026-05-15 01:40:31');

-- --------------------------------------------------------

--
-- Table structure for table `vouchers`
--

CREATE TABLE `vouchers` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `code` varchar(20) NOT NULL,
  `used` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `addresses`
--
ALTER TABLE `addresses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `couriers`
--
ALTER TABLE `couriers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_code` (`order_code`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `courier_id` (`courier_id`);

--
-- Indexes for table `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `service_id` (`service_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `order_id` (`order_id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_category` (`category`),
  ADD KEY `idx_active` (`is_active`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `user_id` (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `addresses`
--
ALTER TABLE `addresses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `couriers`
--
ALTER TABLE `couriers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `vouchers`
--
ALTER TABLE `vouchers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `addresses`
--
ALTER TABLE `addresses`
  ADD CONSTRAINT `addresses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `couriers`
--
ALTER TABLE `couriers`
  ADD CONSTRAINT `couriers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`courier_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`);

--
-- Constraints for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD CONSTRAINT `vouchers_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
