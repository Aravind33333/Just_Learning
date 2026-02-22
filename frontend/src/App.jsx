import React from 'react';
import SignUpPages from './pages/SignUpPages';
import SignInPage from './pages/SignInPage';
import AccountSetup from './pages/AccountSetup';
import Dashboard from './pages/Dashboard';
import './index.css';

function App() {
  const path = window.location.pathname;

  let PageComponent;
  if (path === '/SignUpPages') {
    PageComponent = SignUpPages;
  } else if (path === '/AccountSetup') {
    PageComponent = AccountSetup;
  } else if (path === '/Dashboard') {
    PageComponent = Dashboard;
  } else {
    PageComponent = SignInPage;
  }

  return (
    <>
      <PageComponent />
    </>
  );
}

export default App;
