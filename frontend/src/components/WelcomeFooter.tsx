import React from "react";
import { Link } from "react-router-dom";

const WelcomeFooter = ({ displayPrivacyPolicy }: { displayPrivacyPolicy?: boolean }) => {
  return (
    <footer className="col-span-full bg-foreground-2 text-foreground-5 py-8 px-4 md:px-10 lg:px-20">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex gap-6 text-sm">
            <Link to="/" className="hover:underline">Home</Link>
            {displayPrivacyPolicy && (
              <a href="/privacy" className="hover:underline">Privacy Policy</a>
            )}
          </div>
          <div className="text-sm text-color-3">
            © {new Date().getFullYear()} ZkPersona
          </div>
        </div>
      </div>
    </footer>
  );
};

export default WelcomeFooter;

