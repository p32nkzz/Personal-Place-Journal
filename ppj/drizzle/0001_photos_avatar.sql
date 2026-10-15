CREATE TABLE `my_place_photos` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`my_place_id` bigint NOT NULL,
	`file_path` varchar(1000),
	`external_url` text,
	`file_name` varchar(255),
	`caption` text,
	`storage_type` enum('UPLOAD','EXTERNAL','S3') NOT NULL DEFAULT 'UPLOAD',
	`is_primary` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `my_place_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_my_place_photos__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
ALTER TABLE `master_place_photos` MODIFY COLUMN `origin_type` enum('ADMIN','VISIT','MY_PLACE') NOT NULL DEFAULT 'ADMIN';--> statement-breakpoint
ALTER TABLE `master_place_photos` ADD `source_my_place_photo_id` bigint AFTER `source_visit_photo_id`;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_file_path` varchar(1000) AFTER `role`;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_storage_type` enum('UPLOAD','S3') AFTER `avatar_file_path`;--> statement-breakpoint
ALTER TABLE `my_place_photos` ADD CONSTRAINT `fk_my_place_photos__my_place_id` FOREIGN KEY (`my_place_id`) REFERENCES `my_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ix_my_place_photos__my_place_id_sort_order` ON `my_place_photos` (`my_place_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_my_place_photos__storage_type` ON `my_place_photos` (`storage_type`);--> statement-breakpoint
ALTER TABLE `master_place_photos` ADD CONSTRAINT `fk_master_place_photos__source_my_place_photo_id` FOREIGN KEY (`source_my_place_photo_id`) REFERENCES `my_place_photos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ix_master_place_photos__source_my_place_photo_id` ON `master_place_photos` (`source_my_place_photo_id`);