import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Rule {
  id: string;
  title: string;
  content: string;
  rule_order: number;
  is_active: boolean;
}

export const RulesModal = () => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('membership_rules')
        .select('*')
        .eq('is_active', true)
        .order('rule_order');

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch rules.',
          variant: 'destructive',
        });
        return;
      }

      setRules(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRules();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          View Rules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Adhyan Library Rules & Regulations
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No rules available at the moment.
            </div>
          ) : (
            <div className="space-y-6">
              {rules.map((rule, index) => (
                <div key={rule.id} className="spfixed top-4 right-4 z-5ace-y-2">
                  <h3 className="font-semibold text-lg text-primary">
                    {index + 1}. {rule.title}
                  </h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {rule.content}
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4 mt-6">
                <p className="text-xs text-muted-foreground text-center">
                  By using our library services, you agree to follow all the above rules and regulations.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};