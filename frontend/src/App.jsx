import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    console.log(data);
  }
  return (
    <>
    <form action="/submit" method="post" onSubmit={handleSubmit}>
      <label htmlFor="name">Name:</label>
      <input type="text" id="name" name="name" />
      <br />
      <label htmlFor="email">Email:</label>
      <input type="email" id="email" name="email" />
      <br />
      <label htmlFor='phone'>Phone:</label>
      <input type="tel" id="phone" name="phone" />
      <br />
      <label htmlFor='age'>Age:</label>
      <input type="number" id="age" name="age" />
      <br />
      <input type="submit" value="Submit" />

    </form>
    </>
  )
}

export default App
