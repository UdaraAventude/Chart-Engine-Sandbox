# Frontend React Roadmap (Beginner → Pro)

# 1. HTML & CSS Fundamentals

## HTML

- Semantic tags (header, nav, section, article, footer)
- Forms (inputs, validation basics)
- Accessibility basics (alt text, labels)

## CSS

- Box model
- Flexbox (VERY IMPORTANT)
- CSS Grid
- Positioning (relative, absolute, fixed)
- Responsive design (media queries)

👉 Goal: Build responsive static websites without frameworks

---

# 2. JavaScript Fundamentals (VERY IMPORTANT)

## Core Basics

- Variables: var, let, const
- Data types:
  - String
  - Number
  - Boolean
  - Null
  - Undefined
  - Symbol (basic idea)
  - Object
  - Array

---

## Functions (VERY IMPORTANT)

### Function Declarations

```js
function add(a, b) {
  return a + b;
}
```

### Function Expressions

```js
const add = function (a, b) {
  return a + b;
};
```

### Arrow Functions (modern standard)

```js
const add = (a, b) => a + b;
```

---

## First-Class Functions

- Functions can be stored in variables
- Passed as arguments
- Returned from other functions

```js
function greet() {
  return function (name) {
    return 'Hello ' + name;
  };
}
```

---

## Higher-Order Functions

- A function that takes or returns another function

Examples:

- map()
- filter()
- reduce()

```js
const numbers = [1, 2, 3];
numbers.map((num) => num * 2);
```

---

## Closures

- Inner function remembers outer function variables

```js
function outer() {
  let count = 0;
  return function inner() {
    count++;
    return count;
  };
}
```

---

## Objects (VERY IMPORTANT)

- Object creation
- Accessing properties
- Nested objects
- Updating immutably

```js
const user = {
  name: 'Nirojan',
  age: 25,
  address: {
    city: 'Jaffna',
  },
};
```

---

## Object Destructuring

```js
const user = { name: 'John', age: 30 };
const { name, age } = user;
```

---

## Array Destructuring

```js
const colors = ['red', 'blue'];
const [first, second] = colors;
```

---

## Arrays (Must master)

- push / pop
- shift / unshift
- map()
- filter()
- reduce()
- forEach()
- find()
- includes()
- slice / splice

---

## Spread & Rest Operators

### Spread

```js
const arr = [1, 2, 3];
const newArr = [...arr, 4, 5];
```

### Objects Spread

```js
const user = { name: 'John' };
const updatedUser = { ...user, age: 25 };
```

### Rest Parameters

```js
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b);
}
```

---

## const, let, var

- const → cannot be reassigned
- let → can be reassigned
- var → avoid (function scoped, outdated)

```js
const name = 'John';
let age = 25;
```

---

## Async JavaScript

- Promises
- async / await
- fetch API
- try/catch error handling

```js
async function getData() {
  try {
    const res = await fetch('api.com');
    const data = await res.json();
  } catch (error) {
    console.log(error);
  }
}
```

---

## Function Returning Functions (Important for React Hooks concept)

```js
function createMultiplier(x) {
  return function (y) {
    return x * y;
  };
}

const double = createMultiplier(2);
double(5); // 10
```

👉 This concept is used in React hooks like custom hooks and closures

---

# 3. DOM Manipulation (Before React) DOM Manipulation (Before React)

- querySelector
- addEventListener
- updating DOM elements
- creating elements dynamically

👉 Goal: Understand what React replaces

---

# 4. React Basics

## Core Concepts

- Components
- JSX
- Props
- State (useState)
- Conditional rendering
- Lists and keys

---

## Hooks

- useState
- useEffect
- useParams
- useLayoutEffect
- useSearchParams
- etc...

---

## Forms

- Controlled components
- Input handling

---

# 5. Intermediate React

- React Router
- API calls (axios / fetch)
- Custom hooks
- Context API
- Component reusability

---

# 6. State Management

- Context API (basic)
- Zustand OR Redux Toolkit (advanced)

---

# 7. Styling

- Tailwind CSS (recommended)
- CSS Modules
- UI libraries (MUI, Ant Design)

---

# 8. Advanced React

- Performance optimization
- React.memo
- useMemo / useCallback
- Lazy loading
- Code splitting

---

# 9. Testing

- Unit testing basics
- Jest
- React Testing Library

---

# 10. Architecture & Developer Workflow

## Application Architectures

### Monolith Architecture

- Single codebase for entire application
- Frontend + backend often tightly coupled
- Easier to start, harder to scale

### Monorepo Architecture

- Multiple projects in one repository
- Shared components, utilities, configs
- Common in large teams (e.g., Nx, Turborepo)

### Microfrontend (Advanced concept)

- Splitting frontend into independent apps
- Each team owns a feature/module
- Useful for very large systems

👉 Goal: Understand trade-offs, not just definitions

---

## Clean Code Principles

- Keep components small and reusable
- Follow single responsibility principle
- Avoid deeply nested logic
- Use meaningful variable and function names
- Separate UI, logic, and API layers
- Avoid prop drilling (use context/state tools)
- Prefer composition over duplication

---

## Developer Workflow

- Git & GitHub
- Deployment (Vercel / Netlify)
- Environment variables
- API integration patterns

---

# 11. Pro Developer Mindset

- Write clean reusable code
- Think in components
- Avoid unnecessary state
- Focus on performance
- Build real projects, not tutorials

---

# Rule of Thumb

70% building, 30% learning and If you only watch tutorials, you will not grow.
