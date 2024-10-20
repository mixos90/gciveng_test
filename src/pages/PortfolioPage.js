import React, { useState, useEffect } from 'react';
import './PortfolioPage.css'; // Your existing styles if needed

function PortfolioPage() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [userInfo, setUserInfo] = useState({
    fullName: '',
    companyName: '',
    email: '',
  });
  const [scores, setScores] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState('next');

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/questions.json'); // Path to your JSON file
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setQuestions(data);

        // Initialize answers with empty values
        const initialAnswers = {};
        data.forEach((_, index) => { initialAnswers[index] = ''; });
        setAnswers(initialAnswers);
      } catch (error) {
        console.error('Error fetching questions:', error);
      }
    };

    fetchQuestions();
  }, []);

  const handleChange = (index, event) => {
    const value = event.target.value;
    setAnswers((prev) => ({
      ...prev,
      [index]: value,
    }));
    updateScore(index, value);
  };

  const updateScore = (index, value) => {
    const newScores = { ...scores };
    const question = questions[index];
    const tm = question.tm || []; // TM array for the current question

    if (index < 11) {
      const numericValue = parseFloat(value);
      newScores[index] = (isNaN(numericValue) || numericValue < tm[0]) ? 0 : tm.filter(fixedValue => numericValue >= fixedValue).length;
    } else if (question.options && question.options.length > 0) {
      const selectedOption = question.options.find(opt => opt.option === value);
      newScores[index] = selectedOption ? selectedOption.points : 0;
    } else {
      newScores[index] = value === 'ΝΑΙ' ? (question.points || 0) : 0; // Yes/No handling
    }

    setScores(newScores);
  };

  const handleUserInfoChange = (event) => {
    const { name, value } = event.target;
    setUserInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Check if all answers are provided
    if (!Object.values(answers).every(answer => answer !== '')) {
      alert('Please answer all the questions.');
      return;
    }

    // Check if user info is filled
    if (!userInfo.fullName || !userInfo.companyName || !userInfo.email) {
      alert('Please provide your full name, company name, and email.');
      return;
    }

    const formData = { userInfo, questions, answers, scores };

    try {
      const response = await fetch('http://localhost:3000/submit-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      alert('Η φόρμα στάλθηκε επιτυχώς!');
    } catch (error) {
      console.error('Αδυναμία αποστολής φόρμας:', error);
      alert('Αδυναμία αποστολής φόρμας');
    }
  };

  const goToNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setSlideDirection('next');
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentIndex > 0) {
      setSlideDirection('prev');
      setCurrentIndex(currentIndex - 1);
    }
  };

  const totalScore = Object.entries(scores)
    .filter(([index]) => parseInt(index) >= 11) // Exclude scores from the first 11 questions
    .reduce((sum, [, score]) => {
      const numericScore = Number(score);
      return !isNaN(numericScore) ? sum + numericScore : sum; // Include only valid numeric scores
    }, 0);

  return (
    <div className="portfolio-page container">
      <h1>Ερωτηματολόγιο</h1>

      <form onSubmit={handleSubmit}>
        <div className="questionnaire-container">
          {questions.length === 0 ? (
            <p>No questions available</p>
          ) : (
            <div className={`card mb-3 question-card ${slideDirection}`}>
              <div className="card-header">
                <h5 className="card-title">Ερώτηση {currentIndex + 1}/{questions.length}</h5>
              </div>
              <div className="card-body">
                <fieldset>
                  <legend>
                    {questions[currentIndex].question}
                    <span className="score-display">
                      {currentIndex < 11
                        ? ` - ΚΛΕΙΔΙΑ: ${scores[currentIndex] !== undefined ? scores[currentIndex] : 0}`
                        : ` - ΜΟΡΙΑ: ${scores[currentIndex] !== undefined ? scores[currentIndex] : 0}`}
                    </span>
                  </legend>

                  {currentIndex < 11 ? ( // Input fields for the first 11 questions
                    <input
                      type="number"
                      value={answers[currentIndex]}
                      onChange={(e) => handleChange(currentIndex, e)}
                      placeholder="Enter area in m²"
                      required
                      className="form-control"
                    />
                  ) : (
                    <div className="option-container">
                      {questions[currentIndex].options && questions[currentIndex].options.length > 0 ? (
                        questions[currentIndex].options.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            className={`btn btn-outline-primary option-button ${answers[currentIndex] === option.option ? 'active' : ''}`}
                            onClick={() => handleChange(currentIndex, { target: { value: option.option } })}
                            type="button" // Prevent form submission on button click
                          >
                            {option.option}
                          </button>
                        ))
                      ) : (
                        // Yes/No questions
                        <>
                          <button
                            className={`btn btn-outline-primary option-button ${answers[currentIndex] === 'ΝΑΙ' ? 'active' : ''}`}
                            onClick={() => handleChange(currentIndex, { target: { value: 'ΝΑΙ' } })}
                            type="button" // Prevent form submission on button click
                          >
                            ΝΑΙ
                          </button>
                          <button
                            className={`btn btn-outline-primary option-button ${answers[currentIndex] === 'ΟΧΙ' ? 'active' : ''}`}
                            onClick={() => handleChange(currentIndex, { target: { value: 'ΟΧΙ' } })}
                            type="button" // Prevent form submission on button click
                          >
                            ΟΧΙ
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </fieldset>
              </div>
            </div>
          )}

          {/* Total Score Display */}
          <div className="total-score">
            <strong>Συνολική βαθμολογία: {totalScore}</strong>
          </div>

          {/* Navigation buttons */}
          <div className="navigation-buttons">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={goToPreviousQuestion}
              disabled={currentIndex === 0}
            >
              Προηγούμενη
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={goToNextQuestion}
              disabled={answers[currentIndex] === ''} // Disable next button if current question is not answered
            >
              Επόμενη
            </button>
          </div>
        </div>
      </form>

      {/* User Information Form */}
      <div className="user-info">
        <h2>Αποστολή ερωτηματολογίου</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Ονοματεπώνυμο:
            <input
              type="text"
              name="fullName"
              value={userInfo.fullName}
              onChange={handleUserInfoChange}
              required
            />
          </label>
          <label>
            Επωνυμία εταιρίας:
            <input
              type="text"
              name="companyName"
              value={userInfo.companyName}
              onChange={handleUserInfoChange}
              required
            />
          </label>
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={userInfo.email}
              onChange={handleUserInfoChange}
              required
            />
          </label>
          <button type="submit">Αποστολή φόρμας</button>
        </form>
      </div>

      <div className="download-link-container">
        <h2>Κατεβάστε την αίτηση διενέργειας επιθεώρησης σε αρχείο PDF</h2>
        <a
          href="https://eurocheck.gr/pdfs/E-02.1%20%CE%91%CE%9B%CE%9A%CE%97%20%CE%94%CE%99%CE%95%CE%9D%CE%95%CE%A1%CE%93%CE%95%CE%9A%CE%A4%CE%97%CE%A2%CE%95%CE%A3%20%CE%93%CE%99%CE%91%20%CE%A4%CE%97%CE%9D%20%CE%9A%CE%91%CE%A4%CE%91%CE%A4%CE%91%CE%9A%CE%97_v7_24.pdf"
          download
          className="btn btn-primary"
        >
          ΑΙΤΗΣΗ ΔΙΕΝΕΡΓΕΙΑΣ ΕΠΙΘΕΩΡΗΣΗΣ
        </a>
      </div>
    </div>
  );
}

export default PortfolioPage;
