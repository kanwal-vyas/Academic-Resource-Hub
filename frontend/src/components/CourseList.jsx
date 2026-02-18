function CourseList({ courses, selectedCourse, onSelectCourse }) {
  return (
    <div>
      <h2>Courses</h2>
      <ul>
        {courses.map((course) => (
          <li key={course.course_id}>
            <button
              className={
                selectedCourse === course.course_id ? "selected" : ""
              }
              onClick={() => onSelectCourse(course.course_id)}
            >
              {course.display_name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CourseList;
