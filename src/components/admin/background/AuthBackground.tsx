import styles from './AuthBackground.module.css';

const AuthBackground = () => {
  return (
    <div className={styles.background}>
      {Array.from({ length: 48 }).map((_, i) => (
        <span key={i}></span>
      ))}
    </div>
  );
};

export default AuthBackground;
