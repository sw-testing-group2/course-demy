require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./src/config/database');

const SALT_ROUNDS = 10;

async function seed() {
  console.log('🌱 Bắt đầu seed dữ liệu...\n');

  // ─── Xóa dữ liệu cũ theo thứ tự tránh lỗi FK ──────────────────────────
  db.exec(`
    DELETE FROM enrollments;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM cart_items;
    DELETE FROM courses;
    DELETE FROM categories;
    DELETE FROM users;
  `);
  console.log('✅ Đã xóa dữ liệu cũ');

  // ─── Insert Users ───────────────────────────────────────────────────────
  const insertUser = db.prepare(`
    INSERT INTO users (full_name, email, password, role)
    VALUES (@full_name, @email, @password, @role)
  `);

  const usersData = [
    { full_name: 'Admin CourseDemy',    email: 'admin@coursedemy.com',      password: 'admin123', role: 'admin' },
    { full_name: 'Tran Thi Instructor', email: 'instructor1@example.com',   password: '123456',   role: 'instructor' },
    { full_name: 'Le Van Instructor',   email: 'instructor2@example.com',   password: '123456',   role: 'instructor' },
    { full_name: 'Nguyen Van Student',  email: 'student1@example.com',      password: '123456',   role: 'student' },
    { full_name: 'Pham Thi Student',    email: 'student2@example.com',      password: '123456',   role: 'student' },
    { full_name: 'Hoang Van Student',   email: 'student3@example.com',      password: '123456',   role: 'student' },
  ];

  // Hash password bất đồng bộ rồi insert
  const hashedUsers = await Promise.all(
    usersData.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, SALT_ROUNDS),
    }))
  );

  const insertManyUsers = db.transaction((users) => {
    for (const user of users) insertUser.run(user);
  });
  insertManyUsers(hashedUsers);

  // Lấy ID sau khi insert
  const admin       = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@coursedemy.com');
  const instructor1 = db.prepare('SELECT id FROM users WHERE email = ?').get('instructor1@example.com');
  const instructor2 = db.prepare('SELECT id FROM users WHERE email = ?').get('instructor2@example.com');

  console.log(`✅ Đã insert ${usersData.length} users`);

  // ─── Insert Categories ──────────────────────────────────────────────────
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, description) VALUES (@name, @description)
  `);

  const categoriesData = [
    { name: 'Lập trình',  description: 'Các khóa học về lập trình và phát triển phần mềm' },
    { name: 'Thiết kế',   description: 'Các khóa học về UI/UX và đồ họa' },
    { name: 'Ngoại ngữ',  description: 'Các khóa học học tiếng Anh, Nhật, Hàn' },
    { name: 'Kinh doanh', description: 'Các khóa học về kinh doanh và khởi nghiệp' },
  ];

  const insertManyCategories = db.transaction((categories) => {
    for (const cat of categories) insertCategory.run(cat);
  });
  insertManyCategories(categoriesData);

  // Lấy ID categories
  const catLapTrinh  = db.prepare('SELECT id FROM categories WHERE name = ?').get('Lập trình');
  const catThietKe   = db.prepare('SELECT id FROM categories WHERE name = ?').get('Thiết kế');
  const catNgoaiNgu  = db.prepare('SELECT id FROM categories WHERE name = ?').get('Ngoại ngữ');
  const catKinhDoanh = db.prepare('SELECT id FROM categories WHERE name = ?').get('Kinh doanh');

  console.log(`✅ Đã insert ${categoriesData.length} categories`);

  // ─── Insert Courses ─────────────────────────────────────────────────────
  const insertCourse = db.prepare(`
    INSERT INTO courses (title, description, price, category_id, instructor_id, status)
    VALUES (@title, @description, @price, @category_id, @instructor_id, @status)
  `);

  const coursesData = [
    {
      title: 'Lập trình Python cơ bản',
      description: 'Khóa học lập trình Python từ cơ bản đến nâng cao dành cho người mới bắt đầu.',
      price: 299000,
      category_id: catLapTrinh.id,
      instructor_id: instructor1.id,
      status: 'approved',
    },
    {
      title: 'JavaScript từ A-Z',
      description: 'Học JavaScript toàn diện từ cú pháp cơ bản đến lập trình bất đồng bộ.',
      price: 399000,
      category_id: catLapTrinh.id,
      instructor_id: instructor1.id,
      status: 'approved',
    },
    {
      title: 'Thiết kế UI/UX với Figma',
      description: 'Nắm vững thiết kế giao diện và trải nghiệm người dùng bằng Figma.',
      price: 249000,
      category_id: catThietKe.id,
      instructor_id: instructor2.id,
      status: 'approved',
    },
    {
      title: 'Tiếng Anh giao tiếp B1',
      description: 'Khóa học tiếng Anh giao tiếp đạt trình độ B1 theo khung CEFR.',
      price: 199000,
      category_id: catNgoaiNgu.id,
      instructor_id: instructor2.id,
      status: 'approved',
    },
    {
      title: 'Khởi nghiệp từ ý tưởng',
      description: 'Hướng dẫn từng bước để biến ý tưởng thành mô hình kinh doanh thực tế.',
      price: 0,
      category_id: catKinhDoanh.id,
      instructor_id: instructor1.id,
      status: 'approved',
    },
    {
      title: 'Docker cho người mới',
      description: 'Làm quen với Docker, container hóa ứng dụng và triển khai thực tế.',
      price: 150000,
      category_id: catLapTrinh.id,
      instructor_id: instructor1.id,
      status: 'pending',
    },
    {
      title: 'Marketing Online cơ bản',
      description: 'Tổng quan về marketing online: SEO, Facebook Ads, Google Ads.',
      price: 99000,
      category_id: catKinhDoanh.id,
      instructor_id: instructor2.id,
      status: 'pending',
    },
  ];

  const insertManyCourses = db.transaction((courses) => {
    for (const course of courses) insertCourse.run(course);
  });
  insertManyCourses(coursesData);

  console.log(`✅ Đã insert ${coursesData.length} courses`);

  // ─── Tổng kết ───────────────────────────────────────────────────────────
  const totalUsers      = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  const totalCourses    = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;

  console.log('\n📊 Tổng kết:');
  console.log(`   Users      : ${totalUsers} records`);
  console.log(`   Categories : ${totalCategories} records`);
  console.log(`   Courses    : ${totalCourses} records`);
  console.log('\n🎉 Seed hoàn tất!');
}

seed().catch((err) => {
  console.error('❌ Lỗi khi seed:', err);
  process.exit(1);
});
