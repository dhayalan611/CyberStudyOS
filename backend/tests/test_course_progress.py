"""Course progress regression tests; no database writes."""
import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock

from app.services.course_progress import recalculate_course_progress


class CourseProgressTests(unittest.TestCase):
    def calculate(self, planned, stored, completed):
        course = SimpleNamespace(id=1, total_topics=planned)
        db = MagicMock()
        db.execute.return_value.one.return_value = (stored, completed)
        recalculate_course_progress(db, course)
        db.flush.assert_called_once()
        return course

    def test_adding_first_topic_preserves_plan(self):
        course = self.calculate(20, 1, 0)
        self.assertEqual((course.total_topics, course.progress), (20, 0))

    def test_completing_first_topic_does_not_complete_course(self):
        course = self.calculate(20, 1, 1)
        self.assertEqual((course.completed_topics, course.progress), (1, 5))

    def test_actual_topics_can_expand_plan(self):
        course = self.calculate(2, 3, 2)
        self.assertEqual((course.total_topics, course.progress), (3, 67))

    def test_incomplete_course_never_rounds_to_complete(self):
        self.assertEqual(self.calculate(201, 201, 200).progress, 99)

    def test_completion_and_empty_course(self):
        self.assertEqual(self.calculate(20, 20, 20).progress, 100)
        self.assertEqual(self.calculate(0, 0, 0).progress, 0)
