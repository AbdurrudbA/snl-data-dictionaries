export const metadata = {
  title: 'SNL Feed Data Dictionaries',
  description: 'Download data dictionaries by category'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{fontFamily:'Inter, system-ui, Arial', background:'#fafafa', color:'#111'}}>
        {children}
      </body>
    </html>
  );
}
