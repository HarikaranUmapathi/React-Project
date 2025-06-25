// src/PasswordStrengthChecker.js
import React, { useState } from 'react';

const PasswordStrengthChecker = () => {
  const [password, setPassword] = useState('');
  const [strength, setStrength] = useState('');

  const checkStrength = (password) => {
    let strength = 'Weak';
    const lengthCriteria = password.length >= 8;
    const numberCriteria = /[0-9]/.test(password);
    const uppercaseCriteria = /[A-Z]/.test(password);
    const lowercaseCriteria = /[a-z]/.test(password);
    const specialCharCriteria = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const criteriaMet = [lengthCriteria, numberCriteria, uppercaseCriteria, lowercaseCriteria, specialCharCriteria].filter(Boolean).length;

    switch (criteriaMet) {
      case 5:
        strength = 'Very Strong';
        break;
      case 4:
        strength = 'Strong';
        break;
      case 3:
        strength = 'Moderate';
        break;
      case 2:
        strength = 'Weak';
        break;
      default:
        strength = 'Very Weak';
    }

    return strength;
  };

  const handleChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setStrength(checkStrength(newPassword));
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Password Strength Checker</h2>
      <input
        type="password"
        value={password}
        onChange={handleChange}
        placeholder="Enter your password"
        style={{ padding: '10px', width: '300px' }}
      />
      <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
        Strength: <span style={{ color: getStrengthColor(strength) }}>{strength}</span>
      </div>
    </div>
  );
};

const getStrengthColor = (strength) => {
  switch (strength) {
    case 'Very Strong':
      return 'green';
    case 'Strong':
      return 'blue';
    case 'Moderate':
      return 'orange';
    case 'Weak':
      return 'red';
    case 'Very Weak':
      return 'darkred';
    default:
      return 'black';
  }
};

export default PasswordStrengthChecker;