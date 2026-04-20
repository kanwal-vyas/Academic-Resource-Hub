import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../auth/AuthContext';
import './CourseOnboardingModal.css';

const CourseOnboardingModal = () => {
  const { user, refreshUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [preferredCourse, setPreferredCourse] = useState("");
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/courses`);
        const result = await response.json();
        if (result.success) {
          setCourses(result.data);
        }
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setFetching(false);
      }
    };
    fetchCourses();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId && !isOtherSelected) return;
    if (isOtherSelected && !preferredCourse.trim()) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session found");

      const response = await fetch(`${API_BASE_URL}/me/onboard`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          course_id: isOtherSelected ? null : selectedCourseId,
          preferred_course: isOtherSelected ? preferredCourse.trim() : null
        })
      });

      const result = await response.json();
      if (result.success) {
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
    } finally {
      setLoading(false);
    }
  };

  if (fetching || !user) return null;

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal animate-popIn">
        <div className="onboarding-header">
          <div className="icon-wrap">🎓</div>
          <h2>Finish Your Profile</h2>
          <p>Please select your Course/Program to get started.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label>Course / Program</label>
            <select 
              className="onboarding-select"
              value={isOtherSelected ? "other" : selectedCourseId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "other") {
                  setIsOtherSelected(true);
                  setSelectedCourseId("");
                } else {
                  setIsOtherSelected(false);
                  setSelectedCourseId(val);
                }
              }}
              required
            >
              <option value="">Select your course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name} ({course.code})</option>
              ))}
              <option value="other">NA (Not Applicable / Not Listed)</option>
            </select>
          </div>

          {isOtherSelected && (
            <div className="form-group animate-fadeIn">
              <label>Specify Course (or type 'NA')</label>
              <input 
                type="text" 
                className="onboarding-input"
                placeholder="Enter course name or NA"
                value={preferredCourse}
                onChange={(e) => setPreferredCourse(e.target.value)}
                required
              />
            </div>
          )}

          <button 
            type="submit" 
            className="onboarding-submit" 
            disabled={loading || (!selectedCourseId && !isOtherSelected)}
          >
            {loading ? (
              <><span className="mini-spinner"></span> Saving...</>
            ) : "Complete Setup"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CourseOnboardingModal;
