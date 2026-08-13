import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';

const CompanyModal = ({ isOpen, onClose, onSubmit, company, title }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    company_code: '',
    logo_url: '',
    establishment_year: '',
    pan: '',
    cin: '',
    gst_no: '',
    full_address: '',
    phone_number: '',
    email_id: '',
    company_type: '',
  });

  useEffect(() => {
    if (company) {
      setFormData(company);
    } else {
      setFormData({
        company_name: '',
        company_code: '',
        logo_url: '',
        establishment_year: '',
        pan: '',
        cin: '',
        gst_no: '',
        full_address: '',
        phone_number: '',
        email_id: '',
        company_type: '',
      });
    }
  }, [company]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-6 pt-5 pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Company Name *</label>
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Company Code *</label>
                  <input
                    type="text"
                    name="company_code"
                    value={formData.company_code}
                    onChange={handleChange}
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Logo URL</label>
                  <input
                    type="text"
                    name="logo_url"
                    value={formData.logo_url}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Establishment Year</label>
                  <input
                    type="number"
                    name="establishment_year"
                    value={formData.establishment_year}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">PAN</label>
                  <input
                    type="text"
                    name="pan"
                    value={formData.pan}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">CIN</label>
                  <input
                    type="text"
                    name="cin"
                    value={formData.cin}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">GST No</label>
                  <input
                    type="text"
                    name="gst_no"
                    value={formData.gst_no}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Email ID</label>
                  <input
                    type="email"
                    name="email_id"
                    value={formData.email_id}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="input-label">Company Type</label>
                  <input
                    type="text"
                    name="company_type"
                    value={formData.company_type}
                    onChange={handleChange}
                    className="input-field"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="input-label">Full Address</label>
                  <textarea
                    name="full_address"
                    value={formData.full_address}
                    onChange={handleChange}
                    rows="2"
                    className="input-field"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {company ? 'Update' : 'Create'} Company
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyModal;