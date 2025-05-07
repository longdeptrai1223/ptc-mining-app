import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const [content, setContent] = useState<string>("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/TERMS_OF_SERVICE.md")
      .then((response) => response.text())
      .then((text) => setContent(text))
      .catch((error) => console.error("Error loading terms of service:", error));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => setLocation("/")}
        className="flex items-center mb-4 text-primary hover:underline"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Quay lại
      </button>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <article className="prose dark:prose-invert prose-sm sm:prose-base lg:prose-lg max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </div>
    </div>
  );
}