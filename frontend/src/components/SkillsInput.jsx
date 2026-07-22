import { useState } from 'react';
import { X } from 'lucide-react';

export default function SkillsInput({ skills, onChange }) {
  const [inputValue, setInputValue] = useState('');

  // skills is expected to be an array of strings
  const skillsArray = Array.isArray(skills) ? skills : (typeof skills === 'string' && skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newSkill = inputValue.trim();
      if (newSkill && !skillsArray.includes(newSkill)) {
        onChange([...skillsArray, newSkill]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && skillsArray.length > 0) {
      onChange(skillsArray.slice(0, -1));
    }
  };

  const removeSkill = (skillToRemove) => {
    onChange(skillsArray.filter(s => s !== skillToRemove));
  };

  return (
    <div className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 flex flex-wrap gap-2 items-center min-h-[48px]">
      {skillsArray.map((skill, index) => (
        <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          <span>{skill}</span>
          <button 
            type="button" 
            onClick={() => removeSkill(skill)}
            className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <input
        type="text"
        className="flex-1 bg-transparent border-none focus:outline-none min-w-[120px] py-1 text-slate-700"
        placeholder={skillsArray.length === 0 ? "Type a skill and press Enter" : "Add more skills..."}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim() && !skillsArray.includes(inputValue.trim())) {
            onChange([...skillsArray, inputValue.trim()]);
            setInputValue('');
          }
        }}
      />
    </div>
  );
}
