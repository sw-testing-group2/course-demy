/**
 * TEST SCRIPT — Kiểm thử API: Chi tiết khóa học, Giỏ hàng, Thêm vào giỏ hàng
 * Cách chạy: node test_cart_course.js
 *
 * Yêu cầu: Server đang chạy tại http://localhost:3000
 *          Dữ liệu đã được seed (node seed.js)
 */

const BASE = 'http://localhost:3000/api';

let passed = 0;
let failed = 0;
const results = [];

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  return { status: res.status, data };
}

function assert(testName, condition, got) {
  if (condition) {
    passed++;
    results.push(`  ✅ PASS: ${testName}`);
  } else {
    failed++;
    results.push(`  ❌ FAIL: ${testName}`);
    if (got !== undefined) results.push(`     ↳ Got: ${JSON.stringify(got)}`);
  }
}

function section(title) {
  results.push(`\n──────────────────────────────────────`);
  results.push(`📦 ${title}`);
  results.push(`──────────────────────────────────────`);
}

async function login(email, password) {
  const { data } = await request('POST', '/auth/login', { email, password });
  return data?.data?.token;
}

async function runTests() {
  console.log('\n🚀 Bắt đầu kiểm thử API CourseDemy...\n');

  // ── Lấy token ───────────────────────────────────────────────────────────────
  const studentToken    = await login('student1@example.com', '123456');
  const student2Token   = await login('student2@example.com', '123456');
  const instructorToken = await login('instructor1@example.com', '123456');

  assert('Login student1 thành công', !!studentToken);
  assert('Login student2 thành công', !!student2Token);
  assert('Login instructor1 thành công', !!instructorToken);

  // ── Lấy danh sách courses để biết ID thực tế ────────────────────────────────
  const coursesRes = await request('GET', '/courses?limit=20');
  const allCourses = coursesRes.data?.data?.courses || [];

  // Tìm 1 khóa học approved mà student1 chưa sở hữu để test thêm giỏ
  const enrollmentsRes = await request('GET', '/enrollments', null, studentToken);
  const ownedIds = (enrollmentsRes.data?.data || []).map(e => e.course.id);
  const cartRes0 = await request('GET', '/cart', null, studentToken);
  const inCartIds = (cartRes0.data?.data || []).map(item => item.course.id);

  // Tìm course approved chưa sở hữu và chưa trong giỏ
  const targetCourse = allCourses.find(c =>
    !ownedIds.includes(c.id) && !inCartIds.includes(c.id)
  );

  results.push(`\n📝 Thông tin môi trường test:`);
  results.push(`   Khóa học approved hiện có: ${allCourses.length}`);
  results.push(`   Student1 đã sở hữu: [${ownedIds.join(', ')}]`);
  results.push(`   Student1 trong giỏ: [${inCartIds.join(', ')}]`);
  results.push(`   Course để test thêm giỏ: ${targetCourse ? `id=${targetCourse.id} "${targetCourse.title}"` : 'KHÔNG TÌM THẤY'}`);

  // ════════════════════════════════════════════════════════════════
  section('CHỨC NĂNG 1: Xem chi tiết khóa học (GET /api/courses/:id)');
  // ════════════════════════════════════════════════════════════════

  if (allCourses.length > 0) {
    const c1 = allCourses[0];

    // Test 1.1 — Lấy chi tiết khóa học hợp lệ
    {
      const { status, data } = await request('GET', `/courses/${c1.id}`);
      assert(`GET /courses/${c1.id} → 200 OK`, status === 200, status);
      assert('Trả về success: true', data.success === true, data.success);
      assert('Có field data.title', !!data.data?.title, data.data);
      assert('Có field data.category.name (nested)', !!data.data?.category?.name, data.data?.category);
      assert('Có field data.instructor.full_name (nested)', !!data.data?.instructor?.full_name, data.data?.instructor);
      assert('Có field data.price', data.data?.price !== undefined, data.data?.price);
      assert('Có field data.status', !!data.data?.status, data.data?.status);
      assert('Có field data.created_at', !!data.data?.created_at, data.data?.created_at);
    }
  } else {
    results.push('  ⚠️  SKIP: Không có khóa học approved để test');
  }

  // Test 1.2 — Khóa học không tồn tại
  {
    const { status, data } = await request('GET', '/courses/99999');
    assert('GET /courses/99999 → 404 Not Found', status === 404, status);
    assert('success: false khi không tìm thấy', data.success === false, data.success);
    assert('Có message lỗi', typeof data.message === 'string', data.message);
  }

  // Test 1.3 — id không hợp lệ (chữ)
  {
    const { status } = await request('GET', '/courses/abc');
    assert('GET /courses/abc (id không hợp lệ) → 404', status === 404, status);
  }

  // ════════════════════════════════════════════════════════════════
  section('CHỨC NĂNG 2: Thêm vào giỏ hàng (POST /api/cart)');
  // ════════════════════════════════════════════════════════════════

  let addedCourseId = null;

  if (targetCourse) {
    // Dọn giỏ hàng trước để đảm bảo trạng thái sạch
    await request('DELETE', `/cart/${targetCourse.id}`, null, studentToken);

    // Test 2.1 — Thêm vào giỏ thành công
    {
      const { status, data } = await request('POST', '/cart', { course_id: targetCourse.id }, studentToken);
      assert(`POST /cart course_id=${targetCourse.id} → 201 Created`, status === 201, status);
      assert('success: true khi thêm thành công', data.success === true, data);
      assert('Có message xác nhận', typeof data.message === 'string', data.message);
      if (status === 201) addedCourseId = targetCourse.id;
    }

    // Test 2.2 — Thêm trùng (đã có trong giỏ)
    if (addedCourseId) {
      const { status, data } = await request('POST', '/cart', { course_id: addedCourseId }, studentToken);
      assert('POST /cart thêm trùng → 409 Conflict', status === 409, status);
      assert('Message báo đã có trong giỏ', data.message?.includes('giỏ'), data.message);
    }
  } else {
    results.push('  ⚠️  SKIP: Không có course phù hợp để test thêm mới vào giỏ');
    results.push('        (Tất cả khóa học đã được sở hữu hoặc đã có trong giỏ)');
    results.push('        → Chạy: node seed.js để reset dữ liệu');
  }

  // Test 2.3 — Thêm khóa học đã sở hữu
  if (ownedIds.length > 0) {
    const { status, data } = await request('POST', '/cart', { course_id: ownedIds[0] }, studentToken);
    assert(`POST /cart course_id=${ownedIds[0]} (đã sở hữu) → 409`, status === 409, status);
    assert('Message báo đã sở hữu', data.message?.includes('sở hữu'), data.message);
  }

  // Test 2.4 — Instructor không được thêm vào giỏ
  {
    const courseId = allCourses[0]?.id || 1;
    const { status } = await request('POST', '/cart', { course_id: courseId }, instructorToken);
    assert('POST /cart với token Instructor → 403 Forbidden', status === 403, status);
  }

  // Test 2.5 — Không có token
  {
    const { status } = await request('POST', '/cart', { course_id: 1 });
    assert('POST /cart không có token → 401 Unauthorized', status === 401, status);
  }

  // Test 2.6 — Thiếu course_id trong body
  {
    const { status, data } = await request('POST', '/cart', {}, studentToken);
    assert('POST /cart thiếu course_id → 400 Bad Request', status === 400, status);
    assert('success: false khi thiếu course_id', data.success === false, data.success);
  }

  // Test 2.7 — course_id không hợp lệ
  {
    const { status } = await request('POST', '/cart', { course_id: 'invalid' }, studentToken);
    assert('POST /cart course_id không hợp lệ → 400', status === 400, status);
  }

  // Test 2.8 — course_id không tồn tại
  {
    const { status, data } = await request('POST', '/cart', { course_id: 99999 }, studentToken);
    assert('POST /cart course_id=99999 (không tồn tại) → 404', status === 404, status);
    assert('Message báo không tìm thấy/chưa duyệt', data.success === false, data.success);
  }

  // ════════════════════════════════════════════════════════════════
  section('CHỨC NĂNG 3: Xem giỏ hàng (GET /api/cart)');
  // ════════════════════════════════════════════════════════════════

  // Test 3.1 — Xem giỏ hàng thành công
  {
    const { status, data } = await request('GET', '/cart', null, studentToken);
    assert('GET /cart → 200 OK', status === 200, status);
    assert('success: true', data.success === true, data.success);
    assert('data là mảng', Array.isArray(data.data), typeof data.data);

    if (data.data?.length > 0) {
      const item = data.data[0];
      assert('Mỗi item có field course.id', item.course?.id !== undefined, item.course);
      assert('Mỗi item có field course.title', !!item.course?.title, item.course?.title);
      assert('Mỗi item có field course.price', item.course?.price !== undefined, item.course?.price);
      assert('Mỗi item có field course.instructor.full_name', !!item.course?.instructor?.full_name, item.course?.instructor);
      assert('Mỗi item có field created_at', !!item.created_at, item.created_at);
    }
  }

  // Test 3.2 — Giỏ hàng của student2 (độc lập với student1)
  {
    const { status, data } = await request('GET', '/cart', null, student2Token);
    assert('GET /cart của student2 → 200 OK', status === 200, status);
    assert('student2 có giỏ hàng riêng (mảng)', Array.isArray(data.data), typeof data.data);
  }

  // Test 3.3 — Không có token
  {
    const { status } = await request('GET', '/cart');
    assert('GET /cart không có token → 401 Unauthorized', status === 401, status);
  }

  // Test 3.4 — Instructor không được xem giỏ hàng
  {
    const { status } = await request('GET', '/cart', null, instructorToken);
    assert('GET /cart với token Instructor → 403 Forbidden', status === 403, status);
  }

  // ════════════════════════════════════════════════════════════════
  section('CHỨC NĂNG 4: Xóa khỏi giỏ hàng (DELETE /api/cart/:courseId)');
  // ════════════════════════════════════════════════════════════════

  // Test 4.1 — Xóa khóa học vừa thêm
  if (addedCourseId) {
    const { status, data } = await request('DELETE', `/cart/${addedCourseId}`, null, studentToken);
    assert(`DELETE /cart/${addedCourseId} → 200 OK`, status === 200, status);
    assert('success: true khi xóa thành công', data.success === true, data.success);
    assert('Có message xác nhận xóa', typeof data.message === 'string', data.message);

    // Xác nhận đã xóa khỏi giỏ thực sự
    const { data: cartAfter } = await request('GET', '/cart', null, studentToken);
    const stillInCart = (cartAfter.data || []).some(item => item.course.id === addedCourseId);
    assert('Khóa học đã thực sự bị xóa khỏi giỏ', !stillInCart, stillInCart);
  } else {
    results.push('  ⚠️  SKIP: Không có course được thêm vào giỏ để test xóa');
  }

  // Test 4.2 — Xóa item không có trong giỏ
  {
    const { status, data } = await request('DELETE', '/cart/99999', null, studentToken);
    assert('DELETE /cart/99999 (không trong giỏ) → 404', status === 404, status);
    assert('success: false khi không tìm thấy', data.success === false, data.success);
  }

  // Test 4.3 — Không có token
  {
    const { status } = await request('DELETE', '/cart/1');
    assert('DELETE /cart/1 không có token → 401 Unauthorized', status === 401, status);
  }

  // Test 4.4 — Instructor không được xóa cart
  {
    const { status } = await request('DELETE', '/cart/1', null, instructorToken);
    assert('DELETE /cart/1 với token Instructor → 403 Forbidden', status === 403, status);
  }

  // ════════════════════════════════════════════════════════════════
  // Tổng kết
  // ════════════════════════════════════════════════════════════════
  results.push(`\n══════════════════════════════════════`);
  results.push(`📊 KẾT QUẢ KIỂM THỬ`);
  results.push(`══════════════════════════════════════`);
  results.push(`  ✅ Passed: ${passed}`);
  results.push(`  ❌ Failed: ${failed}`);
  results.push(`  📝 Total : ${passed + failed}`);
  results.push(failed === 0
    ? `\n  🎉 Tất cả test đều PASS!`
    : `\n  ⚠️  Có ${failed} test FAIL, cần kiểm tra lại.`
  );

  console.log(results.join('\n'));
}

runTests().catch(err => {
  console.error('\n❌ Lỗi khi chạy test:', err.message);
  console.error('  → Hãy đảm bảo server đang chạy: npm run dev (trong thư mục backend)');
  process.exit(1);
});
