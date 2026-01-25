program zkpersona_passport_v3.aleo;

record Passport:
    owner as address.private;
    total_stamps as u32.private;
    total_points as u64.private;
    humanity_score as u64.private;
    stamps_commitment as field.private;
    score_commitment as field.private;
    issued_at as u64.private;
    updated_at as u64.private;
    nonce as field.private;

record StampRecord:
    owner as address.private;
    stamp_id as u32.private;
    platform_id as u8.private;
    points as u64.private;
    social_commitment as field.private;
    issued_at as u64.private;

struct StampMetadata:
    stamp_id as u32;
    platform_id as u8;
    points as u64;
    name_hash as field;
    is_active as boolean;
    created_at as u64;

struct SocialBinding:
    commitment as field;
    platform_id as u8;
    claimed_at as u64;
    is_active as boolean;

struct PointClaim:
    user as address;
    platform_id as u8;
    commitment as field;
    points as u64;
    claimed_at as u64;
    is_active as boolean;

struct Admin:
    admin_address as address;
    permissions as u8;
    added_at as u64;

struct Nullifier:
    nullifier as field;
    app_id as field;
    used_at as u64;

mapping admins:
    key as address.public;
    value as Admin.public;

mapping is_admin:
    key as address.public;
    value as boolean.public;

mapping is_initialized:
    key as u32.public;
    value as boolean.public;

mapping stamps:
    key as u32.public;
    value as StampMetadata.public;

mapping stamp_count:
    key as u32.public;
    value as u32.public;

mapping nullifiers:
    key as field.public;
    value as Nullifier.public;

mapping social_commitments:
    key as field.public;
    value as SocialBinding.public;

mapping point_claims:
    key as field.public;
    value as PointClaim.public;

mapping user_platform_claims:
    key as field.public;
    value as boolean.public;

function initialize:
    input r0 as address.private;
    async initialize r0 into r1;
    output r1 as zkpersona_passport_v3.aleo/initialize.future;

finalize initialize:
    input r0 as address.public;
    get.or_use is_initialized[0u32] false into r1;
    not r1 into r2;
    assert.eq r2 true;
    cast r0 15u8 0u64 into r3 as Admin;
    set r3 into admins[r0];
    set true into is_admin[r0];
    set true into is_initialized[0u32];

function add_admin:
    input r0 as address.public;
    input r1 as u8.public;
    async add_admin self.caller r0 r1 into r2;
    output r2 as zkpersona_passport_v3.aleo/add_admin.future;

finalize add_admin:
    input r0 as address.public;
    input r1 as address.public;
    input r2 as u8.public;
    cast r0 0u8 0u64 into r3 as Admin;
    get.or_use admins[r0] r3 into r4;
    and r4.permissions 1u8 into r5;
    is.eq r5 1u8 into r6;
    assert.eq r6 true;
    cast r1 r2 0u64 into r7 as Admin;
    set r7 into admins[r1];
    set true into is_admin[r1];

function remove_admin:
    input r0 as address.public;
    async remove_admin self.caller r0 into r1;
    output r1 as zkpersona_passport_v3.aleo/remove_admin.future;

finalize remove_admin:
    input r0 as address.public;
    input r1 as address.public;
    cast r0 0u8 0u64 into r2 as Admin;
    get.or_use admins[r0] r2 into r3;
    and r3.permissions 4u8 into r4;
    is.eq r4 4u8 into r5;
    assert.eq r5 true;
    is.neq r1 r0 into r6;
    assert.eq r6 true;
    set false into is_admin[r1];

function create_stamp:
    input r0 as u8.public;
    input r1 as u64.public;
    input r2 as field.public;
    async create_stamp self.caller r0 r1 r2 into r3;
    output 0u32 as u32.private;
    output r3 as zkpersona_passport_v3.aleo/create_stamp.future;

finalize create_stamp:
    input r0 as address.public;
    input r1 as u8.public;
    input r2 as u64.public;
    input r3 as field.public;
    cast r0 0u8 0u64 into r4 as Admin;
    get.or_use admins[r0] r4 into r5;
    and r5.permissions 1u8 into r6;
    is.eq r6 1u8 into r7;
    assert.eq r7 true;
    get.or_use stamp_count[0u32] 0u32 into r8;
    add r8 1u32 into r9;
    cast r9 r1 r2 r3 true 0u64 into r10 as StampMetadata;
    set r10 into stamps[r9];
    set r9 into stamp_count[0u32];

function edit_stamp:
    input r0 as u32.public;
    input r1 as u64.public;
    input r2 as boolean.public;
    async edit_stamp self.caller r0 r1 r2 into r3;
    output r3 as zkpersona_passport_v3.aleo/edit_stamp.future;

finalize edit_stamp:
    input r0 as address.public;
    input r1 as u32.public;
    input r2 as u64.public;
    input r3 as boolean.public;
    cast r0 0u8 0u64 into r4 as Admin;
    get.or_use admins[r0] r4 into r5;
    and r5.permissions 2u8 into r6;
    is.eq r6 2u8 into r7;
    assert.eq r7 true;
    cast r1 0u8 0u64 0field false 0u64 into r8 as StampMetadata;
    get.or_use stamps[r1] r8 into r9;
    cast r1 r9.platform_id r2 r9.name_hash r3 r9.created_at into r10 as StampMetadata;
    set r10 into stamps[r1];

function delete_stamp:
    input r0 as u32.public;
    async delete_stamp self.caller r0 into r1;
    output r1 as zkpersona_passport_v3.aleo/delete_stamp.future;

finalize delete_stamp:
    input r0 as address.public;
    input r1 as u32.public;
    cast r0 0u8 0u64 into r2 as Admin;
    get.or_use admins[r0] r2 into r3;
    and r3.permissions 4u8 into r4;
    is.eq r4 4u8 into r5;
    assert.eq r5 true;
    cast r1 0u8 0u64 0field false 0u64 into r6 as StampMetadata;
    get.or_use stamps[r1] r6 into r7;
    cast r1 r7.platform_id r7.points r7.name_hash false r7.created_at into r8 as StampMetadata;
    set r8 into stamps[r1];

function issue_stamp:
    input r0 as Passport.record;
    input r1 as address.public;
    input r2 as u32.public;
    input r3 as u64.public;
    is.eq r0.owner r1 into r4;
    assert.eq r4 true;
    cast r1 r2 0u8 r3 0field 0u64 into r5 as StampRecord.record;
    async issue_stamp self.caller r2 r3 into r6;
    output r5 as StampRecord.record;
    output r6 as zkpersona_passport_v3.aleo/issue_stamp.future;

finalize issue_stamp:
    input r0 as address.public;
    input r1 as u32.public;
    input r2 as u64.public;
    cast r0 0u8 0u64 into r3 as Admin;
    get.or_use admins[r0] r3 into r4;
    and r4.permissions 8u8 into r5;
    is.eq r5 8u8 into r6;
    assert.eq r6 true;
    cast r1 0u8 0u64 0field false 0u64 into r7 as StampMetadata;
    get.or_use stamps[r1] r7 into r8;
    assert.eq r8.is_active true;
    is.eq r8.points r2 into r9;
    assert.eq r9 true;

function claim_social_stamp:
    input r0 as Passport.record;
    input r1 as u8.public;
    input r2 as field.private;
    input r3 as u32.public;
    input r4 as u64.public;
    is.eq r0.owner self.caller into r5;
    assert.eq r5 true;
    cast self.caller r3 r1 r4 r2 0u64 into r6 as StampRecord.record;
    add r0.total_stamps 1u32 into r7;
    cast r0.owner r7 r0.total_points r0.humanity_score r0.stamps_commitment r0.score_commitment r0.issued_at 0u64 r0.nonce into r8 as Passport.record;
    async claim_social_stamp r2 r1 r3 r4 into r9;
    output r8 as Passport.record;
    output r6 as StampRecord.record;
    output r9 as zkpersona_passport_v3.aleo/claim_social_stamp.future;

finalize claim_social_stamp:
    input r0 as field.public;
    input r1 as u8.public;
    input r2 as u32.public;
    input r3 as u64.public;
    cast 0field 0u8 0u64 false into r4 as SocialBinding;
    get.or_use social_commitments[r0] r4 into r5;
    not r5.is_active into r6;
    assert.eq r6 true;
    get stamps[r2] into r7;
    assert.eq r7.is_active true;
    is.eq r7.platform_id r1 into r8;
    assert.eq r8 true;
    is.eq r7.points r3 into r9;
    assert.eq r9 true;
    cast r0 r1 0u64 true into r10 as SocialBinding;
    set r10 into social_commitments[r0];

function create_passport:
    input r0 as field.public;
    cast self.caller 0u32 0u64 0u64 0field 0field 0u64 0u64 r0 into r1 as Passport.record;
    async create_passport into r2;
    output r1 as Passport.record;
    output r2 as zkpersona_passport_v3.aleo/create_passport.future;

finalize create_passport:
    assert.eq true true;

function aggregate_stamps:
    input r0 as Passport.record;
    input r1 as StampRecord.record;
    input r2 as StampRecord.record;
    input r3 as StampRecord.record;
    input r4 as StampRecord.record;
    input r5 as StampRecord.record;
    input r6 as field.private;
    is.eq r1.owner r0.owner into r7;
    assert.eq r7 true;
    is.eq r2.owner r0.owner into r8;
    assert.eq r8 true;
    is.eq r3.owner r0.owner into r9;
    assert.eq r9 true;
    is.eq r4.owner r0.owner into r10;
    assert.eq r10 true;
    is.eq r5.owner r0.owner into r11;
    assert.eq r11 true;
    cast r1.stamp_id r2.stamp_id r3.stamp_id r4.stamp_id r5.stamp_id into r12 as [u32; 5u32];
    is.neq r1.stamp_id 0u32 into r13;
    ternary r13 1u32 0u32 into r14;
    is.neq r2.stamp_id 0u32 into r15;
    ternary r15 1u32 0u32 into r16;
    add r14 r16 into r17;
    is.neq r3.stamp_id 0u32 into r18;
    ternary r18 1u32 0u32 into r19;
    add r17 r19 into r20;
    is.neq r4.stamp_id 0u32 into r21;
    ternary r21 1u32 0u32 into r22;
    add r20 r22 into r23;
    is.neq r5.stamp_id 0u32 into r24;
    ternary r24 1u32 0u32 into r25;
    add r23 r25 into r26;
    is.neq r1.stamp_id 0u32 into r27;
    ternary r27 r1.points 0u64 into r28;
    is.neq r2.stamp_id 0u32 into r29;
    ternary r29 r2.points 0u64 into r30;
    add r28 r30 into r31;
    is.neq r3.stamp_id 0u32 into r32;
    ternary r32 r3.points 0u64 into r33;
    add r31 r33 into r34;
    is.neq r4.stamp_id 0u32 into r35;
    ternary r35 r4.points 0u64 into r36;
    add r34 r36 into r37;
    is.neq r5.stamp_id 0u32 into r38;
    ternary r38 r5.points 0u64 into r39;
    add r37 r39 into r40;
    cast r26 into r41 as u64;
    mul r41 5u64 into r42;
    div r40 100u64 into r43;
    add r42 r43 into r44;
    gt r44 100u64 into r45;
    ternary r45 100u64 r44 into r46;
    cast r12[0u32] into r47 as field;
    mul r47 r47 into r48;
    mul r48 1field into r49;
    mul r49 17field into r50;
    add 0field r50 into r51;
    cast r12[1u32] into r52 as field;
    mul r52 r52 into r53;
    mul r53 2field into r54;
    mul r54 17field into r55;
    add r51 r55 into r56;
    cast r12[2u32] into r57 as field;
    mul r57 r57 into r58;
    mul r58 3field into r59;
    mul r59 17field into r60;
    add r56 r60 into r61;
    cast r12[3u32] into r62 as field;
    mul r62 r62 into r63;
    mul r63 4field into r64;
    mul r64 17field into r65;
    add r61 r65 into r66;
    cast r12[4u32] into r67 as field;
    mul r67 r67 into r68;
    mul r68 5field into r69;
    mul r69 17field into r70;
    add r66 r70 into r71;
    cast r46 into r72 as field;
    mul r72 r6 into r73;
    mul r72 r72 into r74;
    add r73 r74 into r75;
    cast r0.owner r26 r40 r46 r71 r75 r0.issued_at 0u64 r0.nonce into r76 as Passport.record;
    async aggregate_stamps into r77;
    output r76 as Passport.record;
    output r77 as zkpersona_passport_v3.aleo/aggregate_stamps.future;

finalize aggregate_stamps:
    assert.eq true true;

function prove_access:
    input r0 as Passport.record;
    input r1 as StampRecord.record;
    input r2 as StampRecord.record;
    input r3 as StampRecord.record;
    input r4 as StampRecord.record;
    input r5 as StampRecord.record;
    input r6 as field.private;
    input r7 as field.public;
    input r8 as u64.public;
    is.eq r1.owner r0.owner into r9;
    assert.eq r9 true;
    is.eq r2.owner r0.owner into r10;
    assert.eq r10 true;
    is.eq r3.owner r0.owner into r11;
    assert.eq r11 true;
    is.eq r4.owner r0.owner into r12;
    assert.eq r12 true;
    is.eq r5.owner r0.owner into r13;
    assert.eq r13 true;
    is.neq r1.stamp_id r2.stamp_id into r14;
    is.eq r1.stamp_id 0u32 into r15;
    or r14 r15 into r16;
    assert.eq r16 true;
    is.neq r1.stamp_id r3.stamp_id into r17;
    is.eq r1.stamp_id 0u32 into r18;
    or r17 r18 into r19;
    assert.eq r19 true;
    is.neq r1.stamp_id r4.stamp_id into r20;
    is.eq r1.stamp_id 0u32 into r21;
    or r20 r21 into r22;
    assert.eq r22 true;
    is.neq r1.stamp_id r5.stamp_id into r23;
    is.eq r1.stamp_id 0u32 into r24;
    or r23 r24 into r25;
    assert.eq r25 true;
    is.neq r2.stamp_id r3.stamp_id into r26;
    is.eq r2.stamp_id 0u32 into r27;
    or r26 r27 into r28;
    assert.eq r28 true;
    is.neq r2.stamp_id r4.stamp_id into r29;
    is.eq r2.stamp_id 0u32 into r30;
    or r29 r30 into r31;
    assert.eq r31 true;
    is.neq r2.stamp_id r5.stamp_id into r32;
    is.eq r2.stamp_id 0u32 into r33;
    or r32 r33 into r34;
    assert.eq r34 true;
    is.neq r3.stamp_id r4.stamp_id into r35;
    is.eq r3.stamp_id 0u32 into r36;
    or r35 r36 into r37;
    assert.eq r37 true;
    is.neq r3.stamp_id r5.stamp_id into r38;
    is.eq r3.stamp_id 0u32 into r39;
    or r38 r39 into r40;
    assert.eq r40 true;
    is.neq r4.stamp_id r5.stamp_id into r41;
    is.eq r4.stamp_id 0u32 into r42;
    or r41 r42 into r43;
    assert.eq r43 true;
    cast r1.stamp_id r2.stamp_id r3.stamp_id r4.stamp_id r5.stamp_id into r44 as [u32; 5u32];
    is.neq r1.stamp_id 0u32 into r45;
    ternary r45 1u32 0u32 into r46;
    is.neq r2.stamp_id 0u32 into r47;
    ternary r47 1u32 0u32 into r48;
    add r46 r48 into r49;
    is.neq r3.stamp_id 0u32 into r50;
    ternary r50 1u32 0u32 into r51;
    add r49 r51 into r52;
    is.neq r4.stamp_id 0u32 into r53;
    ternary r53 1u32 0u32 into r54;
    add r52 r54 into r55;
    is.neq r5.stamp_id 0u32 into r56;
    ternary r56 1u32 0u32 into r57;
    add r55 r57 into r58;
    is.neq r1.stamp_id 0u32 into r59;
    ternary r59 r1.points 0u64 into r60;
    is.neq r2.stamp_id 0u32 into r61;
    ternary r61 r2.points 0u64 into r62;
    add r60 r62 into r63;
    is.neq r3.stamp_id 0u32 into r64;
    ternary r64 r3.points 0u64 into r65;
    add r63 r65 into r66;
    is.neq r4.stamp_id 0u32 into r67;
    ternary r67 r4.points 0u64 into r68;
    add r66 r68 into r69;
    is.neq r5.stamp_id 0u32 into r70;
    ternary r70 r5.points 0u64 into r71;
    add r69 r71 into r72;
    cast r58 into r73 as u64;
    mul r73 5u64 into r74;
    div r72 100u64 into r75;
    add r74 r75 into r76;
    gt r76 100u64 into r77;
    ternary r77 100u64 r76 into r78;
    gte r78 r8 into r79;
    assert.eq r79 true;
    cast r44[0u32] into r80 as field;
    mul r80 r80 into r81;
    mul r81 1field into r82;
    mul r82 17field into r83;
    add 0field r83 into r84;
    cast r44[1u32] into r85 as field;
    mul r85 r85 into r86;
    mul r86 2field into r87;
    mul r87 17field into r88;
    add r84 r88 into r89;
    cast r44[2u32] into r90 as field;
    mul r90 r90 into r91;
    mul r91 3field into r92;
    mul r92 17field into r93;
    add r89 r93 into r94;
    cast r44[3u32] into r95 as field;
    mul r95 r95 into r96;
    mul r96 4field into r97;
    mul r97 17field into r98;
    add r94 r98 into r99;
    cast r44[4u32] into r100 as field;
    mul r100 r100 into r101;
    mul r101 5field into r102;
    mul r102 17field into r103;
    add r99 r103 into r104;
    is.eq r0.stamps_commitment r104 into r105;
    assert.eq r105 true;
    cast r78 into r106 as field;
    mul r106 r6 into r107;
    mul r106 r106 into r108;
    add r107 r108 into r109;
    is.eq r0.score_commitment r109 into r110;
    assert.eq r110 true;
    mul r0.nonce 7919field into r111;
    mul r7 7907field into r112;
    add r111 r112 into r113;
    add r0.nonce r7 into r114;
    mul r113 r114 into r115;
    mul r0.nonce r7 into r116;
    add r115 r116 into r117;
    async prove_access r117 r7 into r118;
    output r117 as field.private;
    output true as boolean.private;
    output r118 as zkpersona_passport_v3.aleo/prove_access.future;

finalize prove_access:
    input r0 as field.public;
    input r1 as field.public;
    cast 0field 0field 0u64 into r2 as Nullifier;
    get.or_use nullifiers[r0] r2 into r3;
    is.eq r3.nullifier 0field into r4;
    assert.eq r4 true;
    cast r0 r1 0u64 into r5 as Nullifier;
    set r5 into nullifiers[r0];

function claim_point:
    input r0 as Passport.record;
    input r1 as u8.public;
    input r2 as field.private;
    input r3 as u64.public;
    is.eq r0.owner self.caller into r4;
    assert.eq r4 true;
    cast self.caller into r5 as field;
    cast r1 into r6 as field;
    mul r5 7919field into r7;
    mul r6 7907field into r8;
    add r7 r8 into r9;
    add r5 r6 into r10;
    mul r9 r10 into r11;
    add r0.total_points r3 into r12;
    cast r0.total_stamps into r13 as u64;
    mul r13 5u64 into r14;
    div r12 100u64 into r15;
    add r14 r15 into r16;
    gt r16 100u64 into r17;
    ternary r17 100u64 r16 into r18;
    cast r0.owner r0.total_stamps r12 r18 r0.stamps_commitment r0.score_commitment r0.issued_at 0u64 r0.nonce into r19 as Passport.record;
    async claim_point self.caller r1 r2 r3 r11 into r20;
    output r19 as Passport.record;
    output r20 as zkpersona_passport_v3.aleo/claim_point.future;

finalize claim_point:
    input r0 as address.public;
    input r1 as u8.public;
    input r2 as field.public;
    input r3 as u64.public;
    input r4 as field.public;
    cast 0field 0u8 0u64 false into r5 as SocialBinding;
    get.or_use social_commitments[r2] r5 into r6;
    assert.eq r6.is_active true;
    is.eq r6.platform_id r1 into r7;
    assert.eq r7 true;
    cast aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc 0u8 0field 0u64 0u64 false into r8 as PointClaim;
    get.or_use point_claims[r2] r8 into r9;
    not r9.is_active into r10;
    assert.eq r10 true;
    get.or_use user_platform_claims[r4] false into r11;
    not r11 into r12;
    assert.eq r12 true;
    cast r0 r1 r2 r3 0u64 true into r13 as PointClaim;
    set r13 into point_claims[r2];
    set true into user_platform_claims[r4];

constructor:
    assert.eq edition 0u16;
