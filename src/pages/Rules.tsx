import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BookOpen, Clock, MapPin, CreditCard, Users, Shield } from 'lucide-react';

interface Rule {
  id: string;
  title: string;
  content: string;
  rule_order: number;
  is_active: boolean;
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_rules')
        .select('*')
        .eq('is_active', true)
        .order('rule_order');

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error fetching rules:', error);
      toast({
        title: "Error",
        description: "Failed to load membership rules",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getIcon = (index: number) => {
    const icons = [Shield, MapPin, Clock, Users, CreditCard, BookOpen];
    const IconComponent = icons[index % icons.length];
    return <IconComponent className="h-6 w-6 text-primary" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Membership Rules & Guidelines
          </h1>
          <p className="text-xl text-muted-foreground">
            Please read through our membership terms and conditions carefully
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <BookOpen className="h-8 w-8 text-primary" />
                Overview
              </CardTitle>
              <CardDescription className="text-base">
                Welcome to our library membership program. We offer two types of memberships designed to suit different study preferences and budgets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/50 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-primary">Fixed Seat Membership</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Premium experience with dedicated resources
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Dedicated seat number</li>
                    <li>• Personal locker included</li>
                    <li>• 24×7 facility access</li>
                    <li>• Monthly cost: ₹3,300</li>
                  </ul>
                </div>
                <div className="p-4 bg-white/50 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-primary">Floating Seat Membership</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Flexible and cost-effective option
                  </p>
                  <ul className="text-sm space-y-1">
                    <li>• Any available seat</li>
                    <li>• 24×7 facility access</li>
                    <li>• No personal locker</li>
                    <li>• Monthly cost: ₹2,200</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {rules.map((rule, index) => (
            <Card key={rule.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  {getIcon(index)}
                  <span>{rule.title}</span>
                  <Badge variant="outline" className="ml-auto">
                    Rule {index + 1}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {rule.content}
                </p>
              </CardContent>
            </Card>
          ))}

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-yellow-800">
                <Shield className="h-6 w-6" />
                Important Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="text-yellow-700">
              <p className="mb-3">
                By booking a membership with us, you agree to abide by all the rules and regulations mentioned above. 
                Violation of any rules may result in membership termination without refund.
              </p>
              <p className="font-medium">
                For any queries or clarifications, please contact our admin team.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}