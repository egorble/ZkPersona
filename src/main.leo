// ZK Passport Identity System

program zkpersona_passport_v6.aleo {
    @noupgrade
    async constructor() {}

    // Data types
    record Passport {
        owner: address,
        total_stamps: u32,
        total_points: u64,
        humanity_score: u64,
        stamps_commitment: field,
        score_commitment: field,
        issued_at: u64,
        updated_at: u64,
        nonce: field
    }
    record StampRecord {
        owner: address,
        stamp_id: u32,
        platform_id: u8,
        points: u64,
        social_commitment: field,
        issued_at: u64
    }
    struct StampMetadata {
        stamp_id: u32,
        platform_id: u8,
        points: u64,
        name_hash: field,
        is_active: bool,
        created_at: u64
    }
    struct SocialBinding {
        commitment: field,
        platform_id: u8,
        claimed_at: u64,
        is_active: bool
    }
    struct Admin {
        admin_address: address,
        permissions: u8,
        added_at: u64,
    }
    struct Nullifier {
        nullifier: field,
        app_id: field,
        used_at: u64
    }

    mapping admins: address => Admin;
    mapping is_admin: address => bool;
    mapping is_initialized: u32 => bool;

    mapping stamps: u32 => StampMetadata;
    mapping stamp_count: u32 => u32;
    mapping nullifiers: field => Nullifier;
    mapping social_commitments: field => SocialBinding;
    mapping used_commitments: field => bool;  // commitment => used (prevents double claim; no user/platform/points stored)
    mapping user_platform_claims: field => bool;  // hash(user_address, platform_id) => bool (prevents same user claiming same platform twice)
    mapping user_total_points: address => u64;  // points credited to account (simple claim, no passport)

    // Helper functions
    inline calculate_humanity_score(stamps_count: u32, total_points: u64) -> u64 {
        let stamp_score: u64 = (stamps_count as u64) * 5u64;
        let points_score: u64 = total_points / 100u64;
        let total_score: u64 = stamp_score + points_score;
        if total_score > 100u64 {
            return 100u64;
        }
        return total_score;
    }
    inline generate_nullifier(passport_nonce: field, app_id: field) -> field {
        let p1: field = 7919field;
        let p2: field = 7907field;
        let hash: field = (passport_nonce * p1 + app_id * p2) * (passport_nonce + app_id);
        hash = hash + passport_nonce * app_id;
        return hash;
    }
    inline compute_stamps_commitment(stamp_ids: [u32; 5]) -> field {
        let commitment: field = 0field;
        let secret_mixer: field = 17field;
        
        let stamp_field0: field = stamp_ids[0u8] as field;
        let square0: field = stamp_field0 * stamp_field0;
        let coef0: field = 1field;
        let mixed0: field = square0 * coef0 * secret_mixer;
        commitment = commitment + mixed0;
        
        let stamp_field1: field = stamp_ids[1u8] as field;
        let square1: field = stamp_field1 * stamp_field1;
        let coef1: field = 2field;
        let mixed1: field = square1 * coef1 * secret_mixer;
        commitment = commitment + mixed1;
        
        let stamp_field2: field = stamp_ids[2u8] as field;
        let square2: field = stamp_field2 * stamp_field2;
        let coef2: field = 3field;
        let mixed2: field = square2 * coef2 * secret_mixer;
        commitment = commitment + mixed2;
        
        let stamp_field3: field = stamp_ids[3u8] as field;
        let square3: field = stamp_field3 * stamp_field3;
        let coef3: field = 4field;
        let mixed3: field = square3 * coef3 * secret_mixer;
        commitment = commitment + mixed3;
        
        let stamp_field4: field = stamp_ids[4u8] as field;
        let square4: field = stamp_field4 * stamp_field4;
        let coef4: field = 5field;
        let mixed4: field = square4 * coef4 * secret_mixer;
        commitment = commitment + mixed4;
        
        return commitment;
    }
    inline compute_score_commitment(score: u64, secret: field) -> field {
        let score_field: field = score as field;
        let commitment: field = score_field * secret;
        commitment = commitment + (score_field * score_field);
        return commitment;
    }
    inline verify_commitment(commitment: field, value: u64, secret: field) -> bool {
        let expected: field = compute_score_commitment(value, secret);
        return commitment == expected;
    }

    // Admin functions

    async transition initialize(owner: address) -> Future {
        return finalize_initialize(owner);
    }

    async function finalize_initialize(owner: address) {
        let initialized: bool = Mapping::get_or_use(is_initialized, 0u32, false);
        assert(!initialized);

        let now: u64 = 0u64;
        let admin: Admin = Admin {
            admin_address: owner,
            permissions: 15u8,
            added_at: now,
        };

        Mapping::set(admins, owner, admin);
        Mapping::set(is_admin, owner, true);
        Mapping::set(is_initialized, 0u32, true);

        // Default stamps (no admin panel needed): platform_id 1=Discord, 2=Twitter, 3=GitHub, 4=Telegram, 6=EVM, 7=Solana, 8=Google, 9=Steam
        let s1: StampMetadata = StampMetadata { stamp_id: 1u32, platform_id: 1u8, points: 78u64, name_hash: 0field, is_active: true, created_at: now };
        let s2: StampMetadata = StampMetadata { stamp_id: 2u32, platform_id: 2u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        let s3: StampMetadata = StampMetadata { stamp_id: 3u32, platform_id: 3u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        let s4: StampMetadata = StampMetadata { stamp_id: 4u32, platform_id: 4u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        let s5: StampMetadata = StampMetadata { stamp_id: 5u32, platform_id: 5u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        let s6: StampMetadata = StampMetadata { stamp_id: 6u32, platform_id: 6u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        let s7: StampMetadata = StampMetadata { stamp_id: 7u32, platform_id: 7u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        let s8: StampMetadata = StampMetadata { stamp_id: 8u32, platform_id: 8u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        let s9: StampMetadata = StampMetadata { stamp_id: 9u32, platform_id: 9u8, points: 80u64, name_hash: 0field, is_active: true, created_at: now };
        Mapping::set(stamps, 1u32, s1);
        Mapping::set(stamps, 2u32, s2);
        Mapping::set(stamps, 3u32, s3);
        Mapping::set(stamps, 4u32, s4);
        Mapping::set(stamps, 5u32, s5);
        Mapping::set(stamps, 6u32, s6);
        Mapping::set(stamps, 7u32, s7);
        Mapping::set(stamps, 8u32, s8);
        Mapping::set(stamps, 9u32, s9);
        Mapping::set(stamp_count, 0u32, 9u32);
    }

    async transition add_admin(public new_admin: address, public permissions: u8) -> Future {
        return finalize_add_admin(self.caller, new_admin, permissions);
    }

    async function finalize_add_admin(caller: address, new_admin: address, permissions: u8) {
        let caller_admin: Admin = Mapping::get_or_use(admins, caller, Admin {
            admin_address: caller,
            permissions: 0u8,
            added_at: 0u64,
        });
        assert((caller_admin.permissions & 1u8) == 1u8);

        let now: u64 = 0u64;
        let admin: Admin = Admin {
            admin_address: new_admin,
            permissions: permissions,
            added_at: now,
        };

        Mapping::set(admins, new_admin, admin);
        Mapping::set(is_admin, new_admin, true);
    }

    async transition remove_admin(public admin_to_remove: address) -> Future {
        return finalize_remove_admin(self.caller, admin_to_remove);
    }

    async function finalize_remove_admin(caller: address, admin_to_remove: address) {
        let caller_admin: Admin = Mapping::get_or_use(admins, caller, Admin {
            admin_address: caller,
            permissions: 0u8,
            added_at: 0u64,
        });
        assert((caller_admin.permissions & 4u8) == 4u8);
        assert(admin_to_remove != caller);

        Mapping::set(is_admin, admin_to_remove, false);
    }

    async transition create_stamp(
        public platform_id: u8,
        public points: u64,
        public name_hash: field
    ) -> (u32, Future) {
        return (0u32, finalize_create_stamp(self.caller, platform_id, points, name_hash));
    }

    async function finalize_create_stamp(caller: address, platform_id: u8, points: u64, name_hash: field) {
        let caller_admin: Admin = Mapping::get_or_use(admins, caller, Admin {
            admin_address: caller,
            permissions: 0u8,
            added_at: 0u64,
        });
        assert((caller_admin.permissions & 1u8) == 1u8);

        let count: u32 = Mapping::get_or_use(stamp_count, 0u32, 0u32);
        let stamp_id: u32 = count + 1u32;
        let now: u64 = 0u64;

        let stamp: StampMetadata = StampMetadata {
            stamp_id: stamp_id,
            platform_id: platform_id,
            points: points,
            name_hash: name_hash,
            is_active: true,
            created_at: now,
        };

        Mapping::set(stamps, stamp_id, stamp);
        Mapping::set(stamp_count, 0u32, stamp_id);
    }

    async transition edit_stamp(
        public stamp_id: u32,
        public points: u64,
        public is_active: bool
    ) -> Future {
        return finalize_edit_stamp(self.caller, stamp_id, points, is_active);
    }

    async function finalize_edit_stamp(caller: address, stamp_id: u32, points: u64, is_active: bool) {
        let caller_admin: Admin = Mapping::get_or_use(admins, caller, Admin {
            admin_address: caller,
            permissions: 0u8,
            added_at: 0u64,
        });
        assert((caller_admin.permissions & 2u8) == 2u8);

        let stamp: StampMetadata = Mapping::get_or_use(stamps, stamp_id, StampMetadata {
            stamp_id: stamp_id,
            platform_id: 0u8,
            points: 0u64,
            name_hash: 0field,
            is_active: false,
            created_at: 0u64,
        });

        let updated_stamp: StampMetadata = StampMetadata {
            stamp_id: stamp_id,
            platform_id: stamp.platform_id,
            points: points,
            name_hash: stamp.name_hash,
            is_active: is_active,
            created_at: stamp.created_at,
        };

        Mapping::set(stamps, stamp_id, updated_stamp);
    }

    async transition delete_stamp(public stamp_id: u32) -> Future {
        return finalize_delete_stamp(self.caller, stamp_id);
    }

    async function finalize_delete_stamp(caller: address, stamp_id: u32) {
        let caller_admin: Admin = Mapping::get_or_use(admins, caller, Admin {
            admin_address: caller,
            permissions: 0u8,
            added_at: 0u64,
        });
        assert((caller_admin.permissions & 4u8) == 4u8);

        let stamp: StampMetadata = Mapping::get_or_use(stamps, stamp_id, StampMetadata {
            stamp_id: stamp_id,
            platform_id: 0u8,
            points: 0u64,
            name_hash: 0field,
            is_active: false,
            created_at: 0u64,
        });

        let deleted_stamp: StampMetadata = StampMetadata {
            stamp_id: stamp_id,
            platform_id: stamp.platform_id,
            points: stamp.points,
            name_hash: stamp.name_hash,
            is_active: false,
            created_at: stamp.created_at,
        };

        Mapping::set(stamps, stamp_id, deleted_stamp);
    }

    // Issue stamp to user as private record (admin function)
    async transition issue_stamp(
        private user_passport: Passport,
        public user: address,
        public stamp_id: u32,
        public points: u64
    ) -> (StampRecord, Future) {
        assert(user_passport.owner == user);

        let now: u64 = 0u64;
        let stamp_record: StampRecord = StampRecord {
            owner: user,
            stamp_id: stamp_id,
            platform_id: 0u8,
            points: points,
            social_commitment: 0field,
            issued_at: now,
        };

        return (stamp_record, finalize_issue_stamp(self.caller, stamp_id, points));
    }

    async function finalize_issue_stamp(caller: address, stamp_id: u32, points: u64) {
        let caller_admin: Admin = Mapping::get_or_use(admins, caller, Admin {
            admin_address: caller,
            permissions: 0u8,
            added_at: 0u64,
        });
        assert((caller_admin.permissions & 8u8) == 8u8);
        
        let stamp: StampMetadata = Mapping::get_or_use(stamps, stamp_id, StampMetadata {
            stamp_id: stamp_id,
            platform_id: 0u8,
            points: 0u64,
            name_hash: 0field,
            is_active: false,
            created_at: 0u64,
        });
        assert(stamp.is_active);
        assert(stamp.points == points);
    }

    // ГОЛОВНА ФУНКЦІЯ: Claim штампу за соцмережу (клейм поінтів)
    async transition claim_social_stamp(
        private passport: Passport,
        public platform_id: u8,
        private social_commitment: field,
        public stamp_id: u32,
        public points: u64
    ) -> (Passport, StampRecord, Future) {
        // Перевірка володіння паспортом
        assert(passport.owner == self.caller);

        // Отримуємо метадані штампу (буде перевірено в finalize)
        let now: u64 = 0u64;

        // Створюємо StampRecord для користувача
        let stamp_record: StampRecord = StampRecord {
            owner: self.caller,
            stamp_id: stamp_id,
            platform_id: platform_id,
            points: points,
            social_commitment: social_commitment,
            issued_at: now,
        };

        // Оновлюємо паспорт
        let new_total_stamps: u32 = passport.total_stamps + 1u32;
        
        let updated_passport: Passport = Passport {
            owner: passport.owner,
            total_stamps: new_total_stamps,
            total_points: passport.total_points,  // Буде оновлено при aggregate
            humanity_score: passport.humanity_score,
            stamps_commitment: passport.stamps_commitment,
            score_commitment: passport.score_commitment,
            issued_at: passport.issued_at,
            updated_at: now,
            nonce: passport.nonce,
        };

        return (
            updated_passport,
            stamp_record,
            finalize_claim_social_stamp(social_commitment, platform_id, stamp_id, points)
        );
    }

    async function finalize_claim_social_stamp(
        commitment: field,
        platform_id: u8,
        stamp_id: u32,
        points: u64
    ) {
        // 1. Перевірка: чи commitment вже використаний?
        let default_binding: SocialBinding = SocialBinding {
            commitment: 0field,
            platform_id: 0u8,
            claimed_at: 0u64,
            is_active: false,
        };
        
        let existing: SocialBinding = Mapping::get_or_use(
            social_commitments,
            commitment,
            default_binding
        );
        
        // Якщо is_active == true, значить вже використаний
        assert(!existing.is_active);

        // 2. Перевірка: чи stamp існує і активний?
        let stamp: StampMetadata = Mapping::get(stamps, stamp_id);
        assert(stamp.is_active);
        assert(stamp.platform_id == platform_id);
        assert(stamp.points == points);

        // 3. Зберігаємо commitment як зайнятий
        let now: u64 = 0u64;
        let binding: SocialBinding = SocialBinding {
            commitment: commitment,
            platform_id: platform_id,
            claimed_at: now,
            is_active: true,
        };
        
        Mapping::set(social_commitments, commitment, binding);
    }

    // User functions (author + inputs private; nothing stored in public state)
    async transition claim_points(private nonce: field) -> (Passport, Future) {
        let now: u64 = 0u64;

        let passport: Passport = Passport {
            owner: self.caller,
            total_stamps: 0u32,
            total_points: 0u64,
            humanity_score: 0u64,
            stamps_commitment: 0field,
            score_commitment: 0field,
            issued_at: now,
            updated_at: now,
            nonce: nonce,
        };

        return (passport, finalize_claim_points());
    }

    async function finalize_claim_points() {
    }
    async transition aggregate_stamps(
        private passport: Passport,
        private stamp1: StampRecord,
        private stamp2: StampRecord,
        private stamp3: StampRecord,
        private stamp4: StampRecord,
        private stamp5: StampRecord,
        private secret: field
    ) -> (Passport, Future) {
        assert(stamp1.owner == passport.owner);
        assert(stamp2.owner == passport.owner);
        assert(stamp3.owner == passport.owner);
        assert(stamp4.owner == passport.owner);
        assert(stamp5.owner == passport.owner);
        let stamp_ids: [u32; 5] = [stamp1.stamp_id, stamp2.stamp_id, stamp3.stamp_id, stamp4.stamp_id, stamp5.stamp_id];
        
        let stamps_count: u32 = (stamp1.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp2.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp3.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp4.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp5.stamp_id != 0u32 ? 1u32 : 0u32);
        let total_points: u64 = (stamp1.stamp_id != 0u32 ? stamp1.points : 0u64) + (stamp2.stamp_id != 0u32 ? stamp2.points : 0u64) + (stamp3.stamp_id != 0u32 ? stamp3.points : 0u64) + (stamp4.stamp_id != 0u32 ? stamp4.points : 0u64) + (stamp5.stamp_id != 0u32 ? stamp5.points : 0u64);

        let score: u64 = calculate_humanity_score(stamps_count, total_points);

        let stamps_commitment: field = compute_stamps_commitment(stamp_ids);
        let score_commitment: field = compute_score_commitment(score, secret);

        let now: u64 = 0u64;
        let updated_passport: Passport = Passport {
            owner: passport.owner,
            total_stamps: stamps_count,
            total_points: total_points,
            humanity_score: score,
            stamps_commitment: stamps_commitment,
            score_commitment: score_commitment,
            issued_at: passport.issued_at,
            updated_at: now,
            nonce: passport.nonce,
        };
        return (updated_passport, finalize_aggregate_stamps());
    }

    async function finalize_aggregate_stamps() {
    }

    // Generate ZK access proof
    async transition prove_access(
        private passport: Passport,
        private stamp1: StampRecord,
        private stamp2: StampRecord,
        private stamp3: StampRecord,
        private stamp4: StampRecord,
        private stamp5: StampRecord,
        private secret: field,
        public app_id: field,
        public min_score: u64
    ) -> (field, bool, Future) {
        assert(stamp1.owner == passport.owner);
        assert(stamp2.owner == passport.owner);
        assert(stamp3.owner == passport.owner);
        assert(stamp4.owner == passport.owner);
        assert(stamp5.owner == passport.owner);
        assert(stamp1.stamp_id != stamp2.stamp_id || stamp1.stamp_id == 0u32);
        assert(stamp1.stamp_id != stamp3.stamp_id || stamp1.stamp_id == 0u32);
        assert(stamp1.stamp_id != stamp4.stamp_id || stamp1.stamp_id == 0u32);
        assert(stamp1.stamp_id != stamp5.stamp_id || stamp1.stamp_id == 0u32);
        assert(stamp2.stamp_id != stamp3.stamp_id || stamp2.stamp_id == 0u32);
        assert(stamp2.stamp_id != stamp4.stamp_id || stamp2.stamp_id == 0u32);
        assert(stamp2.stamp_id != stamp5.stamp_id || stamp2.stamp_id == 0u32);
        assert(stamp3.stamp_id != stamp4.stamp_id || stamp3.stamp_id == 0u32);
        assert(stamp3.stamp_id != stamp5.stamp_id || stamp3.stamp_id == 0u32);
        assert(stamp4.stamp_id != stamp5.stamp_id || stamp4.stamp_id == 0u32);

        let stamp_ids: [u32; 5] = [stamp1.stamp_id, stamp2.stamp_id, stamp3.stamp_id, stamp4.stamp_id, stamp5.stamp_id];
        let stamps_count: u32 = (stamp1.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp2.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp3.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp4.stamp_id != 0u32 ? 1u32 : 0u32) + (stamp5.stamp_id != 0u32 ? 1u32 : 0u32);
        let total_points: u64 = (stamp1.stamp_id != 0u32 ? stamp1.points : 0u64) + (stamp2.stamp_id != 0u32 ? stamp2.points : 0u64) + (stamp3.stamp_id != 0u32 ? stamp3.points : 0u64) + (stamp4.stamp_id != 0u32 ? stamp4.points : 0u64) + (stamp5.stamp_id != 0u32 ? stamp5.points : 0u64);

        let score: u64 = calculate_humanity_score(stamps_count, total_points);

        assert(score >= min_score);

        let stamps_commitment: field = compute_stamps_commitment(stamp_ids);
        assert(passport.stamps_commitment == stamps_commitment);

        let score_commitment: field = compute_score_commitment(score, secret);
        assert(passport.score_commitment == score_commitment);

        let nullifier: field = generate_nullifier(passport.nonce, app_id);
        return (nullifier, true, finalize_prove_access(nullifier, app_id));
    }

    async function finalize_prove_access(nullifier: field, app_id: field) {
        let existing: Nullifier = Mapping::get_or_use(nullifiers, nullifier, Nullifier {
            nullifier: 0field,
            app_id: 0field,
            used_at: 0u64,
        });
        assert(existing.nullifier == 0field);

        let now: u64 = 0u64;
        let nullifier_record: Nullifier = Nullifier {
            nullifier: nullifier,
            app_id: app_id,
            used_at: now,
        };
        Mapping::set(nullifiers, nullifier, nullifier_record);
    }


    // Helper function to generate user-platform hash
    inline hash_user_platform(user: address, platform_id: u8) -> field {
        let user_field: field = user as field;
        let platform_field: field = (platform_id as field);
        let hash: field = user_field * 7919field + platform_field * 7907field;
        hash = hash * (user_field + platform_field);
        return hash;
    }

    // Простий клейм поінтів: одна транзакція на соцмережу, без паспорта. Поінти прив'язуються до caller.
    async transition claim_verification(
        public platform_id: u8,
        private social_commitment: field,
        public points: u64
    ) -> Future {
        return finalize_claim_verification(social_commitment, platform_id, self.caller, points);
    }

    async function finalize_claim_verification(
        commitment: field,
        platform_id: u8,
        user: address,
        points: u64
    ) {
        let default_binding: SocialBinding = SocialBinding {
            commitment: 0field,
            platform_id: 0u8,
            claimed_at: 0u64,
            is_active: false,
        };
        let existing: SocialBinding = Mapping::get_or_use(social_commitments, commitment, default_binding);
        assert(!existing.is_active);

        let now: u64 = 0u64;
        let binding: SocialBinding = SocialBinding {
            commitment: commitment,
            platform_id: platform_id,
            claimed_at: now,
            is_active: true,
        };
        Mapping::set(social_commitments, commitment, binding);

        let user_platform_hash: field = hash_user_platform(user, platform_id);
        let already_claimed: bool = Mapping::get_or_use(user_platform_claims, user_platform_hash, false);
        assert(!already_claimed);
        Mapping::set(user_platform_claims, user_platform_hash, true);

        let current: u64 = Mapping::get_or_use(user_total_points, user, 0u64);
        Mapping::set(user_total_points, user, current + points);
    }

    // Claim points after successful social connection. Author, platform, points private; only opaque hashes stored.
    async transition claim_point(
        private passport: Passport,
        private platform_id: u8,
        private social_commitment: field,
        private points: u64
    ) -> (Passport, Future) {
        assert(passport.owner == self.caller);
        let user_platform_hash: field = hash_user_platform(self.caller, platform_id);

        let now: u64 = 0u64;
        let new_total_points: u64 = passport.total_points + points;
        let new_humanity_score: u64 = calculate_humanity_score(passport.total_stamps, new_total_points);

        let updated_passport: Passport = Passport {
            owner: passport.owner,
            total_stamps: passport.total_stamps,
            total_points: new_total_points,
            humanity_score: new_humanity_score,
            stamps_commitment: passport.stamps_commitment,
            score_commitment: passport.score_commitment,
            issued_at: passport.issued_at,
            updated_at: now,
            nonce: passport.nonce,
        };

        return (
            updated_passport,
            finalize_claim_point(social_commitment, user_platform_hash)
        );
    }

    async function finalize_claim_point(commitment: field, user_platform_hash: field) {
        let default_binding: SocialBinding = SocialBinding {
            commitment: 0field,
            platform_id: 0u8,
            claimed_at: 0u64,
            is_active: false,
        };
        let binding: SocialBinding = Mapping::get_or_use(
            social_commitments,
            commitment,
            default_binding
        );
        assert(binding.is_active);

        let already_used: bool = Mapping::get_or_use(used_commitments, commitment, false);
        assert(!already_used);

        let already_claimed: bool = Mapping::get_or_use(user_platform_claims, user_platform_hash, false);
        assert(!already_claimed);

        Mapping::set(used_commitments, commitment, true);
        Mapping::set(user_platform_claims, user_platform_hash, true);
    }

}
