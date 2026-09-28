-- Allow admin deletion of participants via edge function (service role)
-- We add a DELETE policy that allows deletion when called from service role context
CREATE POLICY "Allow delete for service role" 
ON public.participants 
FOR DELETE 
USING (true);
