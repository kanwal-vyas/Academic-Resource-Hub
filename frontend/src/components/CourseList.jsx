function CourseList({ courses, selectedCourse, onSelectCourse }) {
  return (
    <div>
      <h2>Courses</h2>
      <ul>
        {courses.map((course) => (
          <li key={course.id}>
            <button
              className={
                selectedCourse === course.id ? "selected" : ""
              }
              onClick={() => onSelectCourse(course.id)}
            >
              {course.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CourseList;