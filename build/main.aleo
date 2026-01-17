program passportapp.aleo;

record PassportRecord:
    owner as address.private;
    passport_owner as address.private;
    total_stamps as u32.private;
    total_points as u64.private;
    humanity_score as u64.private;
    created_at as u64.private;
    updated_at as u64.private;

struct Stamp:
    stamp_id as u32;
    name as field;
    description as field;
    category as field;
    points as u64;
    is_active as boolean;
    created_at as u64;

struct Task:
    task_id as u32;
    stamp_id as u32;
    task_type as u8;
    requirement as field;
    verification_data as field;
    is_active as boolean;

struct Passport:
    passport_owner as address;
    total_stamps as u32;
    total_points as u64;
    humanity_score as u64;
    created_at as u64;
    updated_at as u64;

struct UserStamp:
    passport_owner as address;
    stamp_id as u32;
    earned_at as u64;
    verification_hash as field;
    is_verified as boolean;

struct Admin:
    admin_address as address;
    permissions as u8;
    added_at as u64;

struct VerificationRequest:
    request_id as u32;
    user as address;
    stamp_id as u32;
    proof as field;
    requested_at as u64;
    status as u8;

mapping admins:
    key as address.public;
    value as Admin.public;

mapping is_admin:
    key as address.public;
    value as boolean.public;

mapping stamps:
    key as u32.public;
    value as Stamp.public;

mapping tasks:
    key as u32.public;
    value as Task.public;

mapping stamp_count:
    key as u32.public;
    value as u32.public;

mapping task_count:
    key as u32.public;
    value as u32.public;

mapping passports:
    key as address.public;
    value as Passport.public;

mapping user_stamps:
    key as field.public;
    value as UserStamp.public;

mapping verification_requests:
    key as u32.public;
    value as VerificationRequest.public;

mapping request_count:
    key as u32.public;
    value as u32.public;

mapping user_stamp_count:
    key as address.public;
    value as u32.public;

mapping is_initialized:
    key as u32.public;
    value as boolean.public;

function initialize:
    input r0 as address.private;
    async initialize r0 into r1;
    output r1 as passportapp.aleo/initialize.future;

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
    output r2 as passportapp.aleo/add_admin.future;

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
    output r1 as passportapp.aleo/remove_admin.future;

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
    input r0 as field.private;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as u64.public;
    async create_stamp self.caller r0 r1 r2 r3 into r4;
    output 0u32 as u32.private;
    output r4 as passportapp.aleo/create_stamp.future;

finalize create_stamp:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as field.public;
    input r3 as field.public;
    input r4 as u64.public;
    cast r0 0u8 0u64 into r5 as Admin;
    get.or_use admins[r0] r5 into r6;
    and r6.permissions 1u8 into r7;
    is.eq r7 1u8 into r8;
    assert.eq r8 true;
    get.or_use stamp_count[0u32] 0u32 into r9;
    add r9 1u32 into r10;
    cast r10 r1 r2 r3 r4 true 0u64 into r11 as Stamp;
    set r11 into stamps[r10];
    set r10 into stamp_count[0u32];

function edit_stamp:
    input r0 as u32.public;
    input r1 as field.private;
    input r2 as field.private;
    input r3 as field.private;
    input r4 as u64.public;
    input r5 as boolean.public;
    async edit_stamp self.caller r0 r1 r2 r3 r4 r5 into r6;
    output r6 as passportapp.aleo/edit_stamp.future;

finalize edit_stamp:
    input r0 as address.public;
    input r1 as u32.public;
    input r2 as field.public;
    input r3 as field.public;
    input r4 as field.public;
    input r5 as u64.public;
    input r6 as boolean.public;
    cast r0 0u8 0u64 into r7 as Admin;
    get.or_use admins[r0] r7 into r8;
    and r8.permissions 2u8 into r9;
    is.eq r9 2u8 into r10;
    assert.eq r10 true;
    cast r1 0field 0field 0field 0u64 false 0u64 into r11 as Stamp;
    get.or_use stamps[r1] r11 into r12;
    cast r1 r2 r3 r4 r5 r6 r12.created_at into r13 as Stamp;
    set r13 into stamps[r1];

function delete_stamp:
    input r0 as u32.public;
    async delete_stamp self.caller r0 into r1;
    output r1 as passportapp.aleo/delete_stamp.future;

finalize delete_stamp:
    input r0 as address.public;
    input r1 as u32.public;
    cast r0 0u8 0u64 into r2 as Admin;
    get.or_use admins[r0] r2 into r3;
    and r3.permissions 4u8 into r4;
    is.eq r4 4u8 into r5;
    assert.eq r5 true;
    cast r1 0field 0field 0field 0u64 false 0u64 into r6 as Stamp;
    get.or_use stamps[r1] r6 into r7;
    cast r1 r7.name r7.description r7.category r7.points false r7.created_at into r8 as Stamp;
    set r8 into stamps[r1];

function create_task:
    input r0 as u32.public;
    input r1 as u8.public;
    input r2 as field.private;
    input r3 as field.private;
    async create_task self.caller r0 r1 r2 r3 into r4;
    output 0u32 as u32.private;
    output r4 as passportapp.aleo/create_task.future;

finalize create_task:
    input r0 as address.public;
    input r1 as u32.public;
    input r2 as u8.public;
    input r3 as field.public;
    input r4 as field.public;
    cast r0 0u8 0u64 into r5 as Admin;
    get.or_use admins[r0] r5 into r6;
    and r6.permissions 1u8 into r7;
    is.eq r7 1u8 into r8;
    assert.eq r8 true;
    get.or_use task_count[0u32] 0u32 into r9;
    add r9 1u32 into r10;
    cast r10 r1 r2 r3 r4 true into r11 as Task;
    set r11 into tasks[r10];
    set r10 into task_count[0u32];

function edit_task:
    input r0 as u32.public;
    input r1 as u32.public;
    input r2 as u8.public;
    input r3 as field.private;
    input r4 as field.private;
    input r5 as boolean.public;
    async edit_task self.caller r0 r1 r2 r3 r4 r5 into r6;
    output r6 as passportapp.aleo/edit_task.future;

finalize edit_task:
    input r0 as address.public;
    input r1 as u32.public;
    input r2 as u32.public;
    input r3 as u8.public;
    input r4 as field.public;
    input r5 as field.public;
    input r6 as boolean.public;
    cast r0 0u8 0u64 into r7 as Admin;
    get.or_use admins[r0] r7 into r8;
    and r8.permissions 2u8 into r9;
    is.eq r9 2u8 into r10;
    assert.eq r10 true;
    cast r1 r2 r3 r4 r5 r6 into r11 as Task;
    set r11 into tasks[r1];

function delete_task:
    input r0 as u32.public;
    async delete_task self.caller r0 into r1;
    output r1 as passportapp.aleo/delete_task.future;

finalize delete_task:
    input r0 as address.public;
    input r1 as u32.public;
    cast r0 0u8 0u64 into r2 as Admin;
    get.or_use admins[r0] r2 into r3;
    and r3.permissions 4u8 into r4;
    is.eq r4 4u8 into r5;
    assert.eq r5 true;
    cast r1 0u32 0u8 0field 0field false into r6 as Task;
    get.or_use tasks[r1] r6 into r7;
    cast r1 r7.stamp_id r7.task_type r7.requirement r7.verification_data false into r8 as Task;
    set r8 into tasks[r1];

function verify_and_grant_stamp:
    input r0 as address.public;
    input r1 as u32.public;
    input r2 as field.private;
    async verify_and_grant_stamp self.caller r0 r1 r2 into r3;
    output r3 as passportapp.aleo/verify_and_grant_stamp.future;

finalize verify_and_grant_stamp:
    input r0 as address.public;
    input r1 as address.public;
    input r2 as u32.public;
    input r3 as field.public;
    cast r0 0u8 0u64 into r4 as Admin;
    get.or_use admins[r0] r4 into r5;
    and r5.permissions 8u8 into r6;
    is.eq r6 8u8 into r7;
    assert.eq r7 true;
    cast r2 0field 0field 0field 0u64 false 0u64 into r8 as Stamp;
    get.or_use stamps[r2] r8 into r9;
    assert.eq r9.is_active true;
    cast r1 into r10 as field;
    cast r2 into r11 as field;
    add r10 r11 into r12;
    cast r1 0u32 0u64 0field false into r13 as UserStamp;
    get.or_use user_stamps[r12] r13 into r14;
    is.eq r14.stamp_id 0u32 into r15;
    branch.eq r15 false to end_then_0_0;
    cast r1 r2 0u64 r3 true into r16 as UserStamp;
    set r16 into user_stamps[r12];
    get.or_use user_stamp_count[r1] 0u32 into r17;
    add r17 1u32 into r18;
    set r18 into user_stamp_count[r1];
    cast r1 0u32 0u64 0u64 0u64 0u64 into r19 as Passport;
    get.or_use passports[r1] r19 into r20;
    add r20.total_stamps 1u32 into r21;
    add r20.total_points r9.points into r22;
    add r20.total_stamps 1u32 into r23;
    add r20.total_points r9.points into r24;
    cast r23 into r25 as u64;
    mul r25 5u64 into r26;
    div r24 100u64 into r27;
    add r26 r27 into r28;
    gt r28 100u64 into r29;
    ternary r29 100u64 r28 into r30;
    cast r1 r21 r22 r30 r20.created_at 0u64 into r31 as Passport;
    set r31 into passports[r1];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function create_passport:
    cast self.caller self.caller 0u32 0u64 0u64 0u64 0u64 into r0 as PassportRecord.record;
    async create_passport self.caller 0u64 into r1;
    output r0 as PassportRecord.record;
    output r1 as passportapp.aleo/create_passport.future;

finalize create_passport:
    input r0 as address.public;
    input r1 as u64.public;
    cast r0 0u32 0u64 0u64 0u64 0u64 into r2 as Passport;
    get.or_use passports[r0] r2 into r3;
    is.eq r3.created_at 0u64 into r4;
    branch.eq r4 false to end_then_0_2;
    cast r0 0u32 0u64 0u64 r1 r1 into r5 as Passport;
    set r5 into passports[r0];
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    position end_otherwise_0_3;

function request_stamp_verification:
    input r0 as u32.public;
    input r1 as field.private;
    async request_stamp_verification self.caller r0 r1 into r2;
    output 0u32 as u32.private;
    output r2 as passportapp.aleo/request_stamp_verification.future;

finalize request_stamp_verification:
    input r0 as address.public;
    input r1 as u32.public;
    input r2 as field.public;
    cast r1 0field 0field 0field 0u64 false 0u64 into r3 as Stamp;
    get.or_use stamps[r1] r3 into r4;
    assert.eq r4.is_active true;
    get.or_use request_count[0u32] 0u32 into r5;
    add r5 1u32 into r6;
    cast r6 r0 r1 r2 0u64 0u8 into r7 as VerificationRequest;
    set r7 into verification_requests[r6];
    set r6 into request_count[0u32];

constructor:
    assert.eq edition 0u16;
