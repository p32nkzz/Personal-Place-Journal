CREATE TABLE `app_settings` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`description` varchar(255),
	`updated_by` bigint,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_app_settings__uid` UNIQUE(`uid`),
	CONSTRAINT `uq_app_settings__key` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `backup_logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`triggered_by` bigint,
	`file_reference` varchar(1000),
	`file_size_bytes` bigint,
	`error_message` text,
	`trigger_type` enum('MANUAL','SCHEDULED') NOT NULL DEFAULT 'MANUAL',
	`status` enum('RUNNING','SUCCESS','FAILED') NOT NULL DEFAULT 'RUNNING',
	`started_at` datetime(3) NOT NULL,
	`finished_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`running_lock` varchar(7) GENERATED ALWAYS AS ((CASE WHEN `status` = 'RUNNING' THEN 'RUNNING' ELSE NULL END)) VIRTUAL,
	CONSTRAINT `backup_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_backup_logs__uid` UNIQUE(`uid`),
	CONSTRAINT `uq_backup_logs__running` UNIQUE(`running_lock`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_categories__uid` UNIQUE(`uid`),
	CONSTRAINT `uq_categories__slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `email_change_requests` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`user_id` bigint NOT NULL,
	`requested_by` bigint NOT NULL,
	`new_email` varchar(255) NOT NULL,
	`token_hash` varchar(255) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`confirmed_at` datetime(3),
	`cancelled_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `email_change_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_email_change_requests__token_hash` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `itineraries` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`user_id` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`start_date` date,
	`end_date` date,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `itineraries_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_itineraries__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
CREATE TABLE `itinerary_places` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`itinerary_id` bigint NOT NULL,
	`my_place_id` bigint NOT NULL,
	`planned_date` date,
	`planned_time` time,
	`note` text,
	`sequence` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `itinerary_places_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_itinerary_places__uid` UNIQUE(`uid`),
	CONSTRAINT `uq_itinerary_places__itinerary_id_sequence` UNIQUE(`itinerary_id`,`sequence`)
);
--> statement-breakpoint
CREATE TABLE `master_place_categories` (
	`master_place_id` bigint NOT NULL,
	`category_id` bigint NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `pk_master_place_categories` PRIMARY KEY(`master_place_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `master_place_photos` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`master_place_id` bigint NOT NULL,
	`source_visit_photo_id` bigint,
	`file_path` varchar(1000),
	`external_url` text,
	`file_name` varchar(255),
	`caption` text,
	`storage_type` enum('UPLOAD','EXTERNAL','S3') NOT NULL DEFAULT 'UPLOAD',
	`origin_type` enum('ADMIN','VISIT') NOT NULL DEFAULT 'ADMIN',
	`is_primary` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_by` bigint NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `master_place_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_master_place_photos__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
CREATE TABLE `master_places` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`google_place_id` varchar(255),
	`name` varchar(255) NOT NULL,
	`address` text NOT NULL,
	`description` text,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`created_by` bigint NOT NULL,
	`updated_by` bigint,
	`deleted_by` bigint,
	`is_active` boolean NOT NULL DEFAULT true,
	`deleted_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `master_places_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_master_places__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
CREATE TABLE `my_place_categories` (
	`my_place_id` bigint NOT NULL,
	`category_id` bigint NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `pk_my_place_categories` PRIMARY KEY(`my_place_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `my_place_master_histories` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`my_place_id` bigint NOT NULL,
	`from_master_place_id` bigint,
	`to_master_place_id` bigint,
	`action` varchar(50) NOT NULL,
	`snapshot_data` json,
	`reason` text,
	`note` text,
	`performed_by` bigint NOT NULL,
	`performed_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `my_place_master_histories_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_my_place_master_histories__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
CREATE TABLE `my_place_tags` (
	`my_place_id` bigint NOT NULL,
	`tag_id` bigint NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `pk_my_place_tags` PRIMARY KEY(`my_place_id`,`tag_id`)
);
--> statement-breakpoint
CREATE TABLE `my_places` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`user_id` bigint NOT NULL,
	`master_place_id` bigint,
	`google_place_id` varchar(255),
	`name` varchar(255) NOT NULL,
	`address` text,
	`description` text,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`master_relation_status` varchar(50) NOT NULL DEFAULT 'UNREFERRED',
	`visit_status` enum('PLAN','VISITED') NOT NULL DEFAULT 'PLAN',
	`is_favorite` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `my_places_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_my_places__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
CREATE TABLE `ref_master_history_actions` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `ref_master_history_actions_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_ref_master_history_actions__code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `ref_master_relation_statuses` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `ref_master_relation_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_ref_master_relation_statuses__code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `ref_tag_colors` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`hex_code` varchar(7) NOT NULL,
	`name` varchar(100) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `ref_tag_colors_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_ref_tag_colors__hex_code` UNIQUE(`hex_code`)
);
--> statement-breakpoint
CREATE TABLE `ref_user_roles` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `ref_user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_ref_user_roles__code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`user_id` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`color` varchar(7) NOT NULL DEFAULT '#64748B',
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_tags__uid` UNIQUE(`uid`),
	CONSTRAINT `uq_tags__user_id_name` UNIQUE(`user_id`,`name`),
	CONSTRAINT `uq_tags__user_id_slug` UNIQUE(`user_id`,`slug`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`username` varchar(20) NOT NULL,
	`email` varchar(255) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(50) NOT NULL DEFAULT 'EXPLORER',
	`preferred_language` enum('ID','EN') NOT NULL DEFAULT 'ID',
	`must_change_password` boolean NOT NULL DEFAULT false,
	`deleted_by` bigint,
	`is_active` boolean NOT NULL DEFAULT true,
	`deleted_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_users__uid` UNIQUE(`uid`),
	CONSTRAINT `uq_users__email` UNIQUE(`email`),
	CONSTRAINT `uq_users__username` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `visit_photos` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`visit_id` bigint NOT NULL,
	`file_path` varchar(1000),
	`external_url` text,
	`file_name` varchar(255),
	`caption` text,
	`storage_type` enum('UPLOAD','EXTERNAL','S3') NOT NULL DEFAULT 'UPLOAD',
	`is_primary` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `visit_photos_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_visit_photos__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`uid` varchar(36) NOT NULL,
	`my_place_id` bigint NOT NULL,
	`itinerary_id` bigint,
	`itinerary_place_id` bigint,
	`visited_at` datetime(3) NOT NULL,
	`rating` smallint,
	`note` text,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_visits__uid` UNIQUE(`uid`)
);
--> statement-breakpoint
ALTER TABLE `app_settings` ADD CONSTRAINT `fk_app_settings__updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `backup_logs` ADD CONSTRAINT `fk_backup_logs__triggered_by` FOREIGN KEY (`triggered_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_change_requests` ADD CONSTRAINT `fk_email_change_requests__user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_change_requests` ADD CONSTRAINT `fk_email_change_requests__requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itineraries` ADD CONSTRAINT `fk_itineraries__user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itinerary_places` ADD CONSTRAINT `fk_itinerary_places__itinerary_id` FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `itinerary_places` ADD CONSTRAINT `fk_itinerary_places__my_place_id` FOREIGN KEY (`my_place_id`) REFERENCES `my_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_place_categories` ADD CONSTRAINT `fk_master_place_categories__master_place_id` FOREIGN KEY (`master_place_id`) REFERENCES `master_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_place_categories` ADD CONSTRAINT `fk_master_place_categories__category_id` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_place_photos` ADD CONSTRAINT `fk_master_place_photos__master_place_id` FOREIGN KEY (`master_place_id`) REFERENCES `master_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_place_photos` ADD CONSTRAINT `fk_master_place_photos__source_visit_photo_id` FOREIGN KEY (`source_visit_photo_id`) REFERENCES `visit_photos`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_place_photos` ADD CONSTRAINT `fk_master_place_photos__created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_places` ADD CONSTRAINT `fk_master_places__created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_places` ADD CONSTRAINT `fk_master_places__updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `master_places` ADD CONSTRAINT `fk_master_places__deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_categories` ADD CONSTRAINT `fk_my_place_categories__my_place_id` FOREIGN KEY (`my_place_id`) REFERENCES `my_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_categories` ADD CONSTRAINT `fk_my_place_categories__category_id` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_master_histories` ADD CONSTRAINT `fk_my_place_master_histories__my_place_id` FOREIGN KEY (`my_place_id`) REFERENCES `my_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_master_histories` ADD CONSTRAINT `fk_my_place_master_histories__from_master_place_id` FOREIGN KEY (`from_master_place_id`) REFERENCES `master_places`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_master_histories` ADD CONSTRAINT `fk_my_place_master_histories__to_master_place_id` FOREIGN KEY (`to_master_place_id`) REFERENCES `master_places`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_master_histories` ADD CONSTRAINT `fk_my_place_master_histories__performed_by` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_tags` ADD CONSTRAINT `fk_my_place_tags__my_place_id` FOREIGN KEY (`my_place_id`) REFERENCES `my_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_place_tags` ADD CONSTRAINT `fk_my_place_tags__tag_id` FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_places` ADD CONSTRAINT `fk_my_places__user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `my_places` ADD CONSTRAINT `fk_my_places__master_place_id` FOREIGN KEY (`master_place_id`) REFERENCES `master_places`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tags` ADD CONSTRAINT `fk_tags__user_id` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `fk_users__deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visit_photos` ADD CONSTRAINT `fk_visit_photos__visit_id` FOREIGN KEY (`visit_id`) REFERENCES `visits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visits` ADD CONSTRAINT `fk_visits__my_place_id` FOREIGN KEY (`my_place_id`) REFERENCES `my_places`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visits` ADD CONSTRAINT `fk_visits__itinerary_id` FOREIGN KEY (`itinerary_id`) REFERENCES `itineraries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visits` ADD CONSTRAINT `fk_visits__itinerary_place_id` FOREIGN KEY (`itinerary_place_id`) REFERENCES `itinerary_places`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ix_app_settings__updated_by` ON `app_settings` (`updated_by`);--> statement-breakpoint
CREATE INDEX `ix_backup_logs__started_at` ON `backup_logs` (`started_at`);--> statement-breakpoint
CREATE INDEX `ix_backup_logs__triggered_by` ON `backup_logs` (`triggered_by`);--> statement-breakpoint
CREATE INDEX `ix_backup_logs__status` ON `backup_logs` (`status`);--> statement-breakpoint
CREATE INDEX `ix_categories__is_active_sort_order` ON `categories` (`is_active`,`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_email_change_requests__user_id` ON `email_change_requests` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_email_change_requests__requested_by` ON `email_change_requests` (`requested_by`);--> statement-breakpoint
CREATE INDEX `ix_email_change_requests__expires_at` ON `email_change_requests` (`expires_at`);--> statement-breakpoint
CREATE INDEX `ix_itineraries__user_id` ON `itineraries` (`user_id`);--> statement-breakpoint
CREATE INDEX `ix_itineraries__start_date` ON `itineraries` (`start_date`);--> statement-breakpoint
CREATE INDEX `ix_itineraries__end_date` ON `itineraries` (`end_date`);--> statement-breakpoint
CREATE INDEX `ix_itinerary_places__my_place_id` ON `itinerary_places` (`my_place_id`);--> statement-breakpoint
CREATE INDEX `ix_itinerary_places__planned_date` ON `itinerary_places` (`planned_date`);--> statement-breakpoint
CREATE INDEX `ix_master_place_categories__category_id` ON `master_place_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `ix_master_place_photos__master_place_id_sort_order` ON `master_place_photos` (`master_place_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_master_place_photos__source_visit_photo_id` ON `master_place_photos` (`source_visit_photo_id`);--> statement-breakpoint
CREATE INDEX `ix_master_place_photos__created_by` ON `master_place_photos` (`created_by`);--> statement-breakpoint
CREATE INDEX `ix_master_places__is_active_deleted_at` ON `master_places` (`is_active`,`deleted_at`);--> statement-breakpoint
CREATE INDEX `ix_master_places__google_place_id` ON `master_places` (`google_place_id`);--> statement-breakpoint
CREATE INDEX `ix_master_places__latitude_longitude` ON `master_places` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `ix_master_places__created_by` ON `master_places` (`created_by`);--> statement-breakpoint
CREATE INDEX `ix_master_places__updated_by` ON `master_places` (`updated_by`);--> statement-breakpoint
CREATE INDEX `ix_master_places__deleted_by` ON `master_places` (`deleted_by`);--> statement-breakpoint
CREATE INDEX `ix_my_place_categories__category_id` ON `my_place_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `ix_my_place_master_histories__my_place_id_performed_at` ON `my_place_master_histories` (`my_place_id`,`performed_at`);--> statement-breakpoint
CREATE INDEX `ix_my_place_master_histories__from_master_place_id` ON `my_place_master_histories` (`from_master_place_id`);--> statement-breakpoint
CREATE INDEX `ix_my_place_master_histories__to_master_place_id` ON `my_place_master_histories` (`to_master_place_id`);--> statement-breakpoint
CREATE INDEX `ix_my_place_master_histories__performed_by` ON `my_place_master_histories` (`performed_by`);--> statement-breakpoint
CREATE INDEX `ix_my_place_master_histories__action` ON `my_place_master_histories` (`action`);--> statement-breakpoint
CREATE INDEX `ix_my_place_tags__tag_id` ON `my_place_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `ix_my_places__user_id_is_active` ON `my_places` (`user_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `ix_my_places__user_id_master_relation_status` ON `my_places` (`user_id`,`master_relation_status`);--> statement-breakpoint
CREATE INDEX `ix_my_places__user_id_visit_status` ON `my_places` (`user_id`,`visit_status`);--> statement-breakpoint
CREATE INDEX `ix_my_places__user_id_is_favorite` ON `my_places` (`user_id`,`is_favorite`);--> statement-breakpoint
CREATE INDEX `ix_my_places__master_relation_status_is_active` ON `my_places` (`master_relation_status`,`is_active`);--> statement-breakpoint
CREATE INDEX `ix_my_places__master_place_id_is_active` ON `my_places` (`master_place_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `ix_my_places__google_place_id` ON `my_places` (`google_place_id`);--> statement-breakpoint
CREATE INDEX `ix_my_places__latitude_longitude` ON `my_places` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `ix_ref_master_history_actions__sort_order` ON `ref_master_history_actions` (`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_ref_master_relation_statuses__sort_order` ON `ref_master_relation_statuses` (`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_ref_tag_colors__sort_order` ON `ref_tag_colors` (`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_ref_tag_colors__is_active` ON `ref_tag_colors` (`is_active`);--> statement-breakpoint
CREATE INDEX `ix_ref_user_roles__sort_order` ON `ref_user_roles` (`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_ref_user_roles__is_active` ON `ref_user_roles` (`is_active`);--> statement-breakpoint
CREATE INDEX `ix_users__role` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `ix_users__deleted_at` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `ix_users__deleted_by` ON `users` (`deleted_by`);--> statement-breakpoint
CREATE INDEX `ix_users__is_active` ON `users` (`is_active`);--> statement-breakpoint
CREATE INDEX `ix_visit_photos__visit_id_sort_order` ON `visit_photos` (`visit_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `ix_visit_photos__storage_type` ON `visit_photos` (`storage_type`);--> statement-breakpoint
CREATE INDEX `ix_visits__my_place_id_visited_at` ON `visits` (`my_place_id`,`visited_at`);--> statement-breakpoint
CREATE INDEX `ix_visits__itinerary_id_visited_at` ON `visits` (`itinerary_id`,`visited_at`);--> statement-breakpoint
CREATE INDEX `ix_visits__itinerary_place_id` ON `visits` (`itinerary_place_id`);