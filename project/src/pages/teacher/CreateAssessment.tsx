import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { API_ENDPOINTS } from '../../config/api';

const CreateAssessment: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    topic: '',
    description: '',
    bloom_level: 'remember',
    num_questions: 5,
    pdf_content: '',
    grade_level: 'grade-6',
  });

  const bloomLevels = [
    { value: 'remember', label: 'Remember - Recall facts and basic concepts' },
    { value: 'understand', label: 'Understand - Explain ideas or concepts' },
    { value: 'apply', label: 'Apply - Use information in new situations' },
    { value: 'analyze', label: 'Analyze - Draw connections among ideas' },
    { value: 'evaluate', label: 'Evaluate - Justify a stand or decision' },
    { value: 'create', label: 'Create - Produce new or original work' },
  ];

  const grades = [
    { value: 'grade-6', label: 'Grade 6' },
    { value: 'grade-7', label: 'Grade 7' },
    { value: 'grade-8', label: 'Grade 8' },
    { value: 'grade-9', label: 'Grade 9' },
    { value: 'grade-10', label: 'Grade 10' },
    { value: 'grade-11', label: 'Grade 11' },
    { value: 'grade-12', label: 'Grade 12' },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'num_questions' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.createAssessment, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create assessment: ${response.status} - ${errorText}`);
      }

      const assessmentData = await response.json();

      // Navigate to content view with generated assessment
      navigate(`/teacher/assessment/${assessmentData.assessment_id}/content`, {
        state: { assessmentData }
      });
    } catch (error) {
      console.error('Error creating assessment:', error);
      alert(`Failed to create assessment: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/teacher')}
            icon={ArrowLeft}
          >
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create Assessment</h1>
            <p className="text-gray-600">Generate personalized learning content and assessments</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              <Input
                label="Topic"
                name="topic"
                value={formData.topic}
                onChange={handleChange}
                placeholder="e.g., Photosynthesis in Plants"
                helperText="Enter the main topic or subject for this assessment"
                required
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  placeholder="Provide a detailed description of what this assessment will cover..."
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Describe the learning objectives and scope of this assessment
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Bloom's Taxonomy Level"
                  name="bloom_level"
                  value={formData.bloom_level}
                  onChange={handleChange}
                  options={bloomLevels}
                  placeholder="Select cognitive level"
                  required
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Level
                  </label>
                  <select
                    name="grade_level"
                    value={formData.grade_level || 'grade-6'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {grades.map((grade) => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Input
                label="Number of Questions for Final Assessment"
                name="num_questions"
                type="number"
                value={formData.num_questions}
                onChange={handleChange}
                min={5}
                max={50}
                helperText="Recommended: 10-20 questions for optimal assessment"
                required
              />
            </div>

            <div className="bg-primary-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold text-primary-900 mb-2">AI-Powered Content Generation</h3>
              <p className="text-primary-700 mb-4">
                Our AI will create comprehensive learning content including:
              </p>
              <ul className="text-primary-700 space-y-1 text-sm">
                <li>• Educational content divided into 3 learning sections</li>
                <li>• In-learning assessments (2 MCQ questions after each section)</li>
                <li>• Final assessment with customized questions</li>
                <li>• Questions aligned with your selected Bloom's taxonomy level</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/teacher')}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={loading}
                icon={Sparkles}
              >
                {loading ? 'Generating Assessment...' : 'Generate Assessment'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default CreateAssessment;