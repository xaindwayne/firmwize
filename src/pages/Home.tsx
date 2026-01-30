import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  UserPlus,
  Brain,
  Users,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';

const services = [
  {
    icon: UserPlus,
    title: 'Onboarding New Talent',
    description: 'Accelerate ramp-up time for new hires with clear, role-specific knowledge and guidance from day one.',
    link: '/services#onboarding',
  },
  {
    icon: Brain,
    title: 'AI Knowledge Vault',
    description: 'An all-knowing internal AI that instantly answers employee questions from your complete knowledge base.',
    link: '/services#knowledge-vault',
  },
  {
    icon: Users,
    title: 'Expert Team Onboarding',
    description: 'Our experts capture, structure, and implement your internal knowledge directly into the AI.',
    link: '/services#expert-onboarding',
  },
  {
    icon: BarChart3,
    title: 'Employee Knowledge Analytics',
    description: 'Track and visualize employee knowledge usage with data-driven insights to improve performance.',
    link: '/services#analytics',
  },
];

const capabilities = [
  'Instant AI-powered answers from your knowledge base',
  'Secure document management with version control',
  'Smart categorization and intelligent search',
  'Real-time analytics and usage tracking',
  'Role-based access control and governance',
  'Expert-led implementation and support',
];

const testimonials = [
  {
    quote: "IntelliBase transformed how our team accesses information. What used to take hours of searching now takes seconds.",
    author: "Sarah Chen",
    role: "Head of Operations",
    company: "TechCorp Inc.",
  },
  {
    quote: "The ease of uploading and organizing our knowledge base is remarkable. Our onboarding time dropped by 40%.",
    author: "Michael Roberts",
    role: "HR Director",
    company: "Global Solutions",
  },
  {
    quote: "Finally, a knowledge management solution that actually gets adopted by teams. The AI chat feature is a game-changer.",
    author: "Emily Thompson",
    role: "VP of Learning",
    company: "Enterprise Co.",
  },
];

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="gradient-hero absolute inset-0 opacity-5" />
        <div className="container relative mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="animate-fade-in text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
              Make company knowledge easy to use,{' '}
              <span className="text-accent">impossible to ignore</span>
            </h1>
            <p className="animate-slide-up mt-6 text-lg text-muted-foreground md:text-xl">
              Transform scattered documents into intelligent, searchable knowledge. 
              Help your team find answers in seconds, not hours.
            </p>
            <div className="animate-slide-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/booking">
                <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  Book a free meeting
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline">
                  Explore our services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Four services to unlock your knowledge
            </h2>
            <p className="mt-4 text-muted-foreground">
              End-to-end solutions for capturing, organizing, accessing, and measuring organizational knowledge.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <Link to={service.link} key={service.title}>
                <Card className="group h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">{service.title}</h3>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground md:text-4xl">
                Everything you need to manage internal intelligence
              </h2>
              <p className="mt-4 text-muted-foreground">
                A complete platform for uploading, organizing, and accessing your organization's knowledge through an intelligent AI assistant.
              </p>
              <ul className="mt-8 space-y-4">
                {capabilities.map((capability) => (
                  <li key={capability} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-accent" />
                    <span className="text-foreground">{capability}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link to="/services">
                  <Button className="bg-accent hover:bg-accent/90">
                    Learn about our services
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-accent/20 via-accent/10 to-transparent p-8">
                <div className="h-full rounded-xl border bg-background/80 p-4 shadow-2xl backdrop-blur">
                  <div className="flex items-center gap-2 border-b pb-3">
                    <div className="h-3 w-3 rounded-full bg-destructive/50" />
                    <div className="h-3 w-3 rounded-full bg-warning/50" />
                    <div className="h-3 w-3 rounded-full bg-success/50" />
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="h-5 w-5 text-accent" />
                      <div className="h-4 w-48 rounded bg-muted" />
                    </div>
                    <div className="ml-8 space-y-2">
                      <div className="h-3 w-full rounded bg-muted/60" />
                      <div className="h-3 w-3/4 rounded bg-muted/60" />
                      <div className="h-3 w-5/6 rounded bg-muted/60" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Trusted by leading organizations
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author} className="bg-background">
                <CardContent className="p-6">
                  <p className="text-foreground italic">"{testimonial.quote}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent font-semibold">
                      {testimonial.author[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl rounded-2xl bg-accent p-8 text-center md:p-12">
            <h2 className="text-3xl font-bold text-accent-foreground md:text-4xl">
              Ready to unlock your organization's knowledge?
            </h2>
            <p className="mt-4 text-accent-foreground/80">
              Schedule a free consultation to see how IntelliBase can transform your team's productivity.
            </p>
            <div className="mt-8">
              <Link to="/booking">
                <Button size="lg" variant="secondary" className="bg-background text-foreground hover:bg-background/90">
                  Book a free meeting
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
