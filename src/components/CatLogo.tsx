import { SVGProps } from 'react';

const CatLogo = (props: SVGProps<SVGSVGElement>) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M100 160C130 160 150 140 150 110C150 80 130 60 100 60C70 60 50 80 50 110C50 140 70 160 100 160Z"
        fill="currentColor"
      />
      <path
        d="M50 80L30 40L70 60"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M150 80L170 40L130 60"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        className="dark:stroke-primary"
        d="M80 100L95 115L105 115L120 100"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        className="dark:stroke-primary"
        d="M100 130L90 125M100 130L110 125M100 130V140"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M40 100L20 105M40 110L15 120"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        d="M160 100L180 105M160 110L185 120"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
      <path
        className="dark:stroke-background-dark"
        d="M70 150C60 160 60 180 80 180C100 180 120 180 140 170C150 160 160 140 140 130C120 120 100 140 80 150Z"
        fill="currentColor"
        stroke="white"
        strokeWidth="4"
      />
      <path
        className="dark:stroke-background-dark"
        d="M120 165C130 175 140 175 150 165C160 155 160 140 150 130"
        fill="none"
        stroke="white"
        strokeWidth="4"
      />
    </svg>
  );
};

export default CatLogo;
